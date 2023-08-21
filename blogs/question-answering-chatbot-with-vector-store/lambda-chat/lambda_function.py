import json
import boto3
import os
import time
import datetime
from io import BytesIO
import PyPDF2
import csv
import sys

from langchain import PromptTemplate, SagemakerEndpoint
from langchain.llms.sagemaker_endpoint import LLMContentHandler
from langchain.text_splitter import CharacterTextSplitter
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document
from langchain.chains.summarize import load_summarize_chain

from langchain.agents import create_csv_agent
from langchain.agents.agent_types import AgentType
from langchain.llms.bedrock import Bedrock
from langchain.chains.question_answering import load_qa_chain

from langchain.vectorstores import FAISS
from langchain.indexes import VectorstoreIndexCreator
from langchain.document_loaders import CSVLoader
from langchain.embeddings import BedrockEmbeddings
from langchain.indexes.vectorstore import VectorStoreIndexWrapper
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.vectorstores import OpenSearchVectorSearch

s3 = boto3.client('s3')
s3_bucket = os.environ.get('s3_bucket') # bucket name
s3_prefix = os.environ.get('s3_prefix')
callLogTableName = os.environ.get('callLogTableName')
configTableName = os.environ.get('configTableName')
endpoint_url = os.environ.get('endpoint_url')
opensearch_url = os.environ.get('opensearch_url')
bedrock_region = os.environ.get('bedrock_region')
rag_type = os.environ.get('rag_type')

# opensearch authorization - id/passwd
opensearch_account = os.environ.get('opensearch_account')
opensearch_passwd = os.environ.get('opensearch_passwd')
# opensearch authorization - aws auth
# from requests_aws4auth import AWS4Auth
# credentials = boto3.Session().get_credentials()
# awsauth = AWS4Auth(credentials.access_key, credentials.secret_key, region, service, session_token=credentials.token)

modelId = os.environ.get('model_id')
print('model_id: ', modelId)
enableRAGForFaiss = False   
accessType = os.environ.get('accessType')

def save_configuration(userId, modelId):
    item = {
        'user-id': {'S':userId},
        'model-id': {'S':modelId}
    }

    client = boto3.client('dynamodb')
    try:
        resp =  client.put_item(TableName=configTableName, Item=item)
        print('resp, ', resp)
    except: 
        raise Exception ("Not able to write into dynamodb")            

def load_configuration(userId):
    print('configTableName: ', configTableName)
    print('userId: ', userId)

    client = boto3.client('dynamodb')    
    try:
        key = {
            'user-id': {'S':userId}
        }

        resp = client.get_item(TableName=configTableName, Key=key)
        print('model-id: ', resp['Item']['model-id']['S'])

        return resp['Item']['model-id']['S']
    except: 
        print('No record of configuration!')
        modelId = os.environ.get('model_id')
        save_configuration(userId, modelId)

        return modelId

# load documents from s3
def load_document(file_type, s3_file_name):
    s3r = boto3.resource("s3")
    doc = s3r.Object(s3_bucket, s3_prefix+'/'+s3_file_name)
    
    if file_type == 'pdf':
        contents = doc.get()['Body'].read()
        reader = PyPDF2.PdfReader(BytesIO(contents))
        
        raw_text = []
        for page in reader.pages:
            raw_text.append(page.extract_text())
        contents = '\n'.join(raw_text)    
        
    elif file_type == 'txt':        
        contents = doc.get()['Body'].read()
    elif file_type == 'csv':        
        body = doc.get()['Body'].read()
        reader = csv.reader(body)        
        contents = CSVLoader(reader)
    
    #print('contents: ', contents)
    new_contents = str(contents).replace("\n"," ") 
    print('length: ', len(new_contents))

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000,chunk_overlap=100)
    texts = text_splitter.split_text(new_contents) 
    #print('texts[0]: ', texts[0])
            
    return texts
              
def get_answer_using_query(query, vectorstore, rag_type):
    wrapper_store = VectorStoreIndexWrapper(vectorstore=vectorstore)        
    
    answer = wrapper_store.query(question=query, llm=llm)    
    print('answer: ', answer)

    return answer

def summerize_text(text):
    docs = [
        Document(
            page_content=text
        )
    ]
    prompt_template = """Write a concise summary of the following:

    {text}
                
    CONCISE SUMMARY """

    PROMPT = PromptTemplate(template=prompt_template, input_variables=["text"])
    chain = load_summarize_chain(llm, chain_type="stuff", prompt=PROMPT)
    summary = chain.run(docs)
    print('summarized text: ', summary)

    return summary

def get_answer_using_template(query, vectorstore, rag_type):        
    #summarized_query = summerize_text(query)        
    #    if rag_type == 'faiss':
    #        query_embedding = vectorstore.embedding_function(summarized_query)
    #        relevant_documents = vectorstore.similarity_search_by_vector(query_embedding)
    #    elif rag_type == 'opensearch':
    #        relevant_documents = vectorstore.similarity_search(summarized_query)
    
    if rag_type == 'faiss':
        query_embedding = vectorstore.embedding_function(query)
        relevant_documents = vectorstore.similarity_search_by_vector(query_embedding)
    elif rag_type == 'opensearch':
        relevant_documents = vectorstore.similarity_search(query)

    print(f'{len(relevant_documents)} documents are fetched which are relevant to the query.')
    print('----')
    for i, rel_doc in enumerate(relevant_documents):
        print(f'## Document {i+1}: {rel_doc.page_content}.......')
        print('---')
    
    print('length of relevant_documents: ', len(relevant_documents))
    
    prompt_template = """Human: Use the following pieces of context to provide a concise answer to the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.

    {context}

    Question: {question}
    Assistant:"""
    PROMPT = PromptTemplate(
        template=prompt_template, input_variables=["context", "question"]
    )

    qa = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vectorstore.as_retriever(
            search_type="similarity", search_kwargs={"k": 3}
        ),
        return_source_documents=True,
        chain_type_kwargs={"prompt": PROMPT}
    )
    result = qa({"query": query})
    print('result: ', result)
    source_documents = result['source_documents']
    print('source_documents: ', source_documents)

    if len(relevant_documents)>=1:
        reference = get_reference(source_documents)
        #print('reference: ', reference)

        return result['result']+reference
    else:
        return result['result']

def get_reference(docs):
    reference = "\n\nFrom\n"
    for doc in docs:
        name = doc.metadata['name']
        page = doc.metadata['page']
    
        reference = reference + (str(page)+'page in '+name+'\n')
    return reference

# Bedrock Contiguration
bedrock_region = bedrock_region
bedrock_config = {
    "region_name":bedrock_region,
    "endpoint_url":endpoint_url
}
    
# supported llm list from bedrock
if accessType=='aws':  # internal user of aws
    boto3_bedrock = boto3.client(
        service_name='bedrock',
        region_name=bedrock_config["region_name"],
        endpoint_url=bedrock_config["endpoint_url"],
    )
else: # preview user
    boto3_bedrock = boto3.client(
        service_name='bedrock',
        region_name=bedrock_config["region_name"],
    )

modelInfo = boto3_bedrock.list_foundation_models()    
print('models: ', modelInfo)

parameters = {
    "maxTokenCount":1024,  
    "stopSequences":[],
    "temperature":0,
    "topP":0.9
}

llm = Bedrock(model_id=modelId, client=boto3_bedrock, model_kwargs=parameters)

# embedding
bedrock_embeddings = BedrockEmbeddings(client=boto3_bedrock)

def lambda_handler(event, context):
    print(event)
    userId  = event['user-id']
    print('userId: ', userId)
    requestId  = event['request-id']
    print('requestId: ', requestId)
    type  = event['type']
    print('type: ', type)
    body = event['body']
    print('body: ', body)

    global modelId, llm, vectorstore, enableRAGForFaiss
    
    if rag_type == 'opensearch':
        vectorstore = OpenSearchVectorSearch(
            # index_name = "rag-index-*", // all
            index_name = 'rag-index-'+userId+'-*',
            is_aoss = False,
            #engine="faiss",  # default: nmslib
            embedding_function = bedrock_embeddings,
            opensearch_url=opensearch_url,
            http_auth=(opensearch_account, opensearch_passwd), # http_auth=awsauth,
        )
    elif rag_type == 'faiss':
        print('enableRAGForFaiss = ', enableRAGForFaiss)
    
    modelId = load_configuration(userId)
    if(modelId==""): 
        modelId = os.environ.get('model_id')
        save_configuration(userId, modelId)

    start = int(time.time())    

    msg = ""
    if type == 'text' and body[:11] == 'list models':
        msg = f"The list of models: \n"
        lists = modelInfo['modelSummaries']
        
        for model in lists:
            msg += f"{model['modelId']}\n"
        
        msg += f"current model: {modelId}"
        print('model lists: ', msg)
    
    elif type == 'text' and body[:20] == 'change the model to ':
        new_model = body.rsplit('to ', 1)[-1]
        print(f"new model: {new_model}, current model: {modelId}")

        if modelId == new_model:
            msg = "No change! The new model is the same as the current model."
        else:        
            lists = modelInfo['modelSummaries']
            isChanged = False
            for model in lists:
                if model['modelId'] == new_model:
                    print(f"new modelId: {new_model}")
                    modelId = new_model
                    llm = Bedrock(model_id=modelId, client=boto3_bedrock)
                    isChanged = True
                    save_configuration(userId, modelId)            

            if isChanged:
                msg = f"The model is changed to {modelId}"
            else:
                msg = f"{modelId} is not in lists."
        print('msg: ', msg)

    else:             
        if type == 'text':
            text = body

            if rag_type == 'faiss' and enableRAGForFaiss == False: 
                msg = llm(text)
            else: 
                querySize = len(text)
                textCount = len(text.split())
                print(f"query size: {querySize}, workds: {textCount}")

                if querySize<1800: # max 1985
                    msg = get_answer_using_template(text, vectorstore, rag_type)
                else:
                    msg = llm(text)
            #print('msg: ', msg)
            
        elif type == 'document':
            object = body
        
            file_type = object[object.rfind('.')+1:len(object)]
            print('file_type: ', file_type)
            
            # load documents where text, pdf, csv are supported
            texts = load_document(file_type, object)

            docs = []
            for i in range(len(texts)):
                docs.append(
                    Document(
                        page_content=texts[i],
                        metadata={
                            'name': object,
                            'page':i+1
                        }
                    )
                )        
            print('docs[0]: ', docs[0])    
            print('docs size: ', len(docs))
                        
            if rag_type == 'faiss':
                if enableRAGForFaiss == False:   
                    vectorstore = FAISS.from_documents( # create vectorstore from a document
                        docs,  # documents
                        bedrock_embeddings  # embeddings
                    )
                    enableRAGForFaiss = True
                else:
                    vectorstore.add_documents(docs)
                    print('vector store size: ', len(vectorstore.docstore._dict))

            elif rag_type == 'opensearch':    
                new_vectorstore = OpenSearchVectorSearch(
                    index_name="rag-index-"+userId+'-'+requestId,
                    is_aoss = False,
                    #engine="faiss",  # default: nmslib
                    embedding_function = bedrock_embeddings,
                    opensearch_url = opensearch_url,
                    http_auth=(opensearch_account, opensearch_passwd),
                )
                new_vectorstore.add_documents(docs)     

                #vectorstore = OpenSearchVectorSearch.from_documents(
                #    docs, 
                #    bedrock_embeddings, 
                #    opensearch_url=opensearch_url,
                #    http_auth=(opensearch_account, opensearch_passwd),
                #)

            # summerization to show the document
            docs = [
                Document(
                    page_content=t
                ) for t in texts[:3]
            ]
            prompt_template = """Write a concise summary of the following:

            {text}
                
            CONCISE SUMMARY """

            PROMPT = PromptTemplate(template=prompt_template, input_variables=["text"])
            chain = load_summarize_chain(llm, chain_type="stuff", prompt=PROMPT)
            summary = chain.run(docs)
            print('summary: ', summary)

            msg = summary
            # summerization
            #query = "summerize the documents"
            #msg = get_answer_using_query(query, vectorstore, rag_type)
            #print('msg1: ', msg)

            #msg = get_answer_using_template(query, vectorstore, rag_type)
            #print('msg2: ', msg)
                
        elapsed_time = int(time.time()) - start
        print("total run time(sec): ", elapsed_time)

        print('msg: ', msg)

        item = {
            'user-id': {'S':userId},
            'request-id': {'S':requestId},
            'type': {'S':type},
            'body': {'S':body},
            'msg': {'S':msg}
        }

        client = boto3.client('dynamodb')
        try:
            resp =  client.put_item(TableName=callLogTableName, Item=item)
        except: 
            raise Exception ("Not able to write into dynamodb")
        
        print('resp, ', resp)

    return {
        'statusCode': 200,
        'msg': msg,
    }