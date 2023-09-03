# VARCO LLM과 OpenSearch를 이용하여 한국어 Chatbot 만들기

여기서는 [VARCO LLM](https://ncsoft.github.io/ncresearch/varco-llm/)와 [Amazon OpenSearch](https://docs.aws.amazon.com/ko_kr/opensearch-service/latest/developerguide/what-is.html)를 이용하여 Question/Answering을 위한 한국어 Chatbot을 구현하고자 합니다. VARCO LLM은 엔씨소프트(NC SOFT)에서 제공하는 대용량 언어 모델(LLM)입니다. VARCO LLM KO-13B-IST는 VARCO LLM KO-13B-FM의 파인튜닝 모델로서 Question and Answering, Summarization등 다양한 태스크에 활용할 수 있으며, [Amazon SageMaker](https://aws.amazon.com/marketplace/seller-profile?id=seller-tkuvdeznmi2w4)를 이용하여 쉽게 배포하여 사용할 수 있습니다.  

대규모 언어 모델(LLM)은 사전학습(Pretrain)을 통해 많은 경우에 좋은 답변을 할 수 있지만, 학습에 포함되지 않은 특정 영역(domain specific)에 대한 질문에 대해서는 때때로 정확히 답변할 수 없습니다. [RAG (Retrieval Augmented Generation) ](https://docs.aws.amazon.com/ko_kr/sagemaker/latest/dg/jumpstart-foundation-models-customize-rag.html)를 이용하면, 외부 문서 저장소에서 질문(Question)에 관련된 문서를 읽어와서 Prompt에 활용하는 방식으로 대용량 모델의 성능을 강화될 수 있습니다. 또한, [Amazon OpenSearch](https://python.langchain.com/docs/integrations/vectorstores/opensearch)는 오픈 소스 기반의 검색 및 분석 서비스로서 대규모 언어 모델에 RAG를 구현할 때 유용하게 활용될 수 있습니다. 

여기서는 대규모 언어 모델을 위한 어플리케이션 개발 프레임워크인 [LangChain](https://www.langchain.com/)을 활용하여 어플리케이션을 개발하며, Amazon의 대표적인 [서버리스 서비스](https://aws.amazon.com/ko/serverless/)인 [Amazon Lambda](https://aws.amazon.com/ko/lambda/)로 서빙하는 인프라를 구축합니다. Amazon Lambda를 비롯한 인프라를 배포하고 관리하기 위하여 [Amazon CDK](https://aws.amazon.com/ko/cdk/)를 활용합니다.

## Architecture 개요

전체적인 Architecture는 아래와 같습니다. 사용자의 질문은 [Amazon CloudFront](https://aws.amazon.com/ko/cloudfront/)와 [Amazon API Gateway](https://aws.amazon.com/ko/api-gateway/)를 거쳐서, Lambda에 전달됩니다. Lambda는 Embedding을 통해 질문(Query)을 Vector화한 다음에, OpenSearch로 전달하여, 관련된 문서(relevant docuements)를 받은후에 VARCO LLM에 전달하여 답변을 얻습니다. 이후 답변은 사용자에게 전달되어 채팅화면에 표시됩니다. 또한 채팅이력은 [Amazon DynamoDB](https://aws.amazon.com/ko/dynamodb/)를 이용해 저장되고 활용됩니다.


<img src="https://github.com/kyopark2014/korean-chatbot-using-varco-llm-and-opensearch/assets/52392004/0baa76e5-5502-45d1-aa0b-71c4a9ce0a27" width="800">


상세한 Call Flow는 아래와 같습니다.

단계1: 사용자가 Question을 입력하면, Query가 CloudFront와 API Gateway를 거쳐서 Lambda (Chat)에 전달됩니다. 

단계2: Query를 Embedding에 전달하여 Vector로 변환합니다. 여기서는 Embedding을 위하여 "GPT-J Embedding"을 이용합니다.

단계3: Vector화된 Query를 OpenSearch에 보내서 Query와 관련된 문서들을 가져옵니다.

단계4: Query와 함께 관계된 문서를 VARCO LLM에 전달하여 응답(response)을 얻습니다.

단계5: DynamoDB에 Call log를 저장합니다.

단계6: 사용자에게 응답으로 결과를 전달합니다.




## 주요 시스템 구성

### LangChain과 연동하기 

LangChain은 LLM application의 개발을 도와주는 Framework으로 Question anc Answering, Summarization등 다양한 task에 맞게 Chain등을 활용하여 편리하게 개발할 수 있습니다. VARCO LLM은 SageMaker Endpoint로 배포되며 이때의 입출력의 형태는 아래와 같습니다. 

VARCO LLM의 Input형태는 아래와 같습니다.

```java
{
  "text": "input text here",
  "request_output_len": 512,
  "repetition_penalty": 1.1,
  "temperature": 0.1,
  "top_k": 50,
  "top_p": 0.1
}
```
VARCO LLM의 Output의 기본 포맷은 아래와 같습니다.

```java
{
  "result": [
    "output text here"
  ]
}
```

상기의 VARCO LLM의 입력과 출력의 포맷을 맞추어서 ContentHandler를 아래와 같이 정의합니다. 상세한 내용은 [lambda-chat](./lambda-chat/lambda_function.py)에서 확인할 수 있습니다.

```python
class ContentHandler(LLMContentHandler):
    content_type = "application/json"
    accepts = "application/json"

    def transform_input(self, prompt: str, model_kwargs: dict) -> bytes:
        input_str = json.dumps({
            "text" : prompt, **model_kwargs
        })
        return input_str.encode('utf-8')
      
    def transform_output(self, output: bytes) -> str:
        response_json = json.loads(output.read().decode("utf-8"))
        return response_json["result"][0]
```

VARCO LLM은 SageMaker endpoint를 이용하여 생성하므로, LangChain의 [SagemakerEndpoint](https://python.langchain.com/docs/integrations/llms/sagemaker)와 ContentHandler를 이용하여 LangChain과 연결합니다. 

```python
from langchain.embeddings import SagemakerEndpointEmbeddings

content_handler = ContentHandler()
aws_region = boto3.Session().region_name
client = boto3.client("sagemaker-runtime")
parameters = {
    "request_output_len": 512,
    "repetition_penalty": 1.1,
    "temperature": 0.1,
    "top_k": 50,
    "top_p": 0.1
} 

llm = SagemakerEndpoint(
    endpoint_name = endpoint_name, 
    region_name = aws_region, 
    model_kwargs = parameters,
    endpoint_kwargs={"CustomAttributes": "accept_eula=true"},
    content_handler = content_handler
)
```

VARCO LLM의 주요 parameter는 아래와 같습니다.
- request_output_len: 생성되는 최대 token의 수, 기본값은 1000입니다.
- repetition_penalty: 반복을 제한하기 위한 파라미터로 1.0이면 no panalty입니다. 기본값은 1.3입니다.
- temperature: 다음 token의 확율(probability)로서 기본값은 0.5입니다.

### Embedding

OpenSearch에 보내는 query를 vector로 변환하기 위해서는 embedding function이 필요합니다. 여기서는 [GPT-J 6B Embedding FP16](https://aws.amazon.com/ko/blogs/machine-learning/fine-tune-gpt-j-using-an-amazon-sagemaker-hugging-face-estimator-and-the-model-parallel-library/)을 이용하여 embedding을 수행합니다. GPT-J embedding은 semantic search와 text generation에 유용하게 이용할 수 있습니다. GPT-J embedding은 SagMaker JumpStart를 이용해 배포할 수 있으므로 [SageMaker Endpoint Embeddings](https://python.langchain.com/docs/integrations/text_embedding/sagemaker-endpoint)을 이용하여 아래와 같이 정의합니다.

```python
from langchain.embeddings.sagemaker_endpoint import EmbeddingsContentHandler
from typing import Dict, List
class ContentHandler2(EmbeddingsContentHandler):
    content_type = "application/json"
    accepts = "application/json"

    def transform_input(self, inputs: List[str], model_kwargs: Dict) -> bytes:
        input_str = json.dumps({ "text_inputs": inputs, ** model_kwargs})
        return input_str.encode("utf-8")

    def transform_output(self, output: bytes) -> List[List[float]]:
        response_json = json.loads(output.read().decode("utf-8"))
        return response_json["embedding"]

content_handler2 = ContentHandler2()
embeddings = SagemakerEndpointEmbeddings(
    endpoint_name = endpoint_embedding,
    region_name = embedding_region,
    content_handler = content_handler2,
)
```

### OpenSearch를 이용하여 Vector Store 구성하기

LangChain의 [OpenSearchVectorSearch](https://api.python.langchain.com/en/latest/vectorstores/langchain.vectorstores.opensearch_vector_search.OpenSearchVectorSearch.html)을 이용하여 vectorstore를 정의합니다. 여기서는 개인화된 RAG를 적용하기 위하여 OpenSearch의 index에 [UUID](https://www.cockroachlabs.com/blog/what-is-a-uuid/)로 구성된 userId를 추가하였습니다. 또한 embedding_function으로 GPT-J embedding을 지정하였습니다.

```python
vectorstore = OpenSearchVectorSearch(
    index_name = 'rag-index-'+userId+'-*',
    is_aoss = False,
    #engine="faiss",  # default: nmslib
    embedding_function = embeddings,
    opensearch_url=opensearch_url,
    http_auth=(opensearch_account, opensearch_passwd), # http_auth=awsauth,
)
```

### 문서를 OpenSearch에 올리기

S3에서 PDF, TXT, CSV 파일을 아래처럼 읽어올 수 있습니다. pdf의 경우에 PyPDF2를 이용하여 S3의 PDF파일을 page 단위로 읽어옵니다. 이때, 불필요한 '\x00', '\x01'은 아래와 같이 제거합니다. 또한 LLM의 token size 제한을 고려하여, 아래와 같이 RecursiveCharacterTextSplitter을 이용하여 chunk 단위로 문서를 나눕니다. 

```python
def load_document(file_type, s3_file_name):
    s3r = boto3.resource("s3")
    doc = s3r.Object(s3_bucket, s3_prefix+'/'+s3_file_name)
    
    if file_type == 'pdf':
        contents = doc.get()['Body'].read()
        reader = PyPDF2.PdfReader(BytesIO(contents))
        
        raw_text = []
        for page in reader.pages:
            page_text = page.extract_text().replace('\x00','')
            raw_text.append(page_text.replace('\x01',''))
        contents = '\n'.join(raw_text)            
        
    elif file_type == 'txt':        
        contents = doc.get()['Body'].read().decode('utf-8')
    elif file_type == 'csv':        
        body = doc.get()['Body'].read().decode('utf-8')
        reader = csv.reader(body)        
        contents = CSVLoader(reader)
    
    new_contents = str(contents).replace("\n"," ") 

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000,chunk_overlap=100)
    texts = text_splitter.split_text(new_contents) 
            
    return texts
```

이제 아래와 같이 load_document()을 이용하여 문서를 texts로 읽은후에 chunk를 page로 하는 Document를 만듭니다. 이때 파일 이름과 page로 구성되는 metadata를 정의합니다. 

```python
texts = load_document(file_type, object)

docs = []
for i in range(len(texts)):
    docs.append(
        Document(
            page_content = texts[i],
            metadata = {
                'name': object,
                'page': i + 1
            }
        )
    )
```

OpenSearch에 문서를 넣을때에, userId와 requestId를 이용해 index_name을 생성하였습니다. 아래처럼 userId를 index에 포함한후 RAG를 관련 index로 검색하면 개인화된 RAG를 구성할 수 있습니다. 만약, 그룹단위로 RAG를 구성한다면 userId 대신에 groupId를 생성하는 방법으로 응용할 수 있습니다. 

```
new_vectorstore = OpenSearchVectorSearch(
    index_name = "rag-index-" + userId + '-' + requestId,
    is_aoss = False,
    #engine = "faiss",  # default: nmslib
    embedding_function = embeddings,
    opensearch_url = opensearch_url,
    http_auth = (opensearch_account, opensearch_passwd),
)
new_vectorstore.add_documents(docs)   
```

### OpenSearch를 이용하여 Query하기

RAG를 수행하는 get_answer_using_template()은 아래와 같습니다. [RetrievalQA](https://api.python.langchain.com/en/latest/chains/langchain.chains.retrieval_qa.base.RetrievalQA.html?highlight=retrievalqa#langchain.chains.retrieval_qa.base.RetrievalQA)은 아래처럼 OpenSearch로 구성된 vectorstore를 retriever로 지정합니다. 이때 search_type을 similarity search로 지정하여 관련 문서를 3개까지 가져오도록 설정하였습니다. RAG의 문서와 함께 template를 사용하여 정확도를 높입니다.

```python
from langchain.chains import RetrievalQA

def get_answer_using_template(query, vectorstore):  
    prompt_template = """다음은 User와 Assistant의 친근한 대화입니다. 
Assistant은 말이 많고 상황에 맞는 구체적인 세부 정보를 많이 제공합니다. 
Assistant는 모르는 질문을 받으면 솔직히 모른다고 말합니다.

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
    source_documents = result['source_documents']

    if len(source_documents)>=1 and enableReference == 'true':
        reference = get_reference(source_documents)
        return result['result']+reference
    else:
        return result['result']
```

RAG에서 Vector 검색에 사용하는 OpenSearch는 query size의 제한이 있습니다. 여기서는 1800자 이상의 query에 대해서만 RAG를 적용합니다. 

```python
if querySize<1800 and enableOpenSearch=='true': 
  answer = get_answer_using_template(text, vectorstore)
else:
  answer = llm(text) 
```

VARCO LLM의 응답에서 "### Assistant:" 이후를 응답으로 사용하기 위하여 아래와 같이 answer에서 msg를 추출합니다.

```python
pos = answer.rfind('### Assistant:\n') + 15
msg = answer[pos:]
```

### AWS CDK로 인프라 구현하기

[CDK 구현 코드](./cdk-varco-opensearch/README.md)에서는 Typescript로 인프라를 정의하는 방법에 대해 상세히 설명하고 있습니다.




## 직접 실습 해보기

### 사전 준비 사항

1) 사전에 아래와 같은 준비가 되어야 합니다.

- [AWS Account 생성](https://repost.aws/ko/knowledge-center/create-and-activate-aws-account)

2) VARCO LLM과 Embedding을 위하여, "ml.g5.12xlarge"와 "ml.g5.2xlarge"를 사용합니다. [Service Quotas - AWS services - Amazon SageMaker](https://us-west-2.console.aws.amazon.com/servicequotas/home/services/sagemaker/quotas)에서 "ml.g5.12xlarge for endpoint usage"와 "ml.g5.2xlarge for endpoint usage"가 각각 최소 1개 이상이 되어야 합니다. 만약 Quota가 없는 경우에 [Request quota increase]을 선택하여 요청합니다.


### CDK를 이용한 인프라 설치
[인프라 설치](./deployment.md)에 따라 CDK로 인프라 설치를 진행합니다. 


### 실행결과

아래와 같이 "Kendra에 대해 설명해줘."라고 질문을 하였습니다. VARCO LLM에서 학습되지 않은 경우에는 아래처럼 기대와 다른 정보를 전달합니다.

![image](https://github.com/kyopark2014/korean-chatbot-using-varco-llm-and-opensearch/assets/52392004/78d1f7df-a2a7-406e-827e-6b7fe590aca5)

[Amazon_Kendra.pdf](./Amazon_Kendra.pdf)을 다운받은 후에 아래 채팅장의 파일버튼을 선택하여 업로드합니다. 이후 Kendra에 등록이 되고 아래와 같이 요약(summarization) 결과를 보여줍니다. Amazon_Kendra.pdf는 Kendra 서비스에 대한 소개자료입니다.

![image](https://github.com/kyopark2014/korean-chatbot-using-varco-llm-and-opensearch/assets/52392004/1a253a3f-4118-44e8-b5e2-9ffc1efd8798)


이제 다시 "Kendra에 대해 설명해줘."라고 질문을 하면 업로드한 Amazon_Kendra.pdf을 참조하여 아래와 같이 Kendra에 대한 정확한 응답을 얻을 수 있습니다.

![image](https://github.com/kyopark2014/korean-chatbot-using-varco-llm-and-opensearch/assets/52392004/9590cc1e-2815-4da2-88bf-67a06e40a311)


## 리소스 정리하기

더이상 인프라를 사용하지 않는 경우에 아래처럼 모든 리소스를 삭제할 수 있습니다. [Cloud9 console](https://us-west-2.console.aws.amazon.com/cloud9control/home?region=us-west-2#/)에 접속하여 아래와 같이 삭제를 합니다.

```java
cdk destroy
```

본 실습에서는 VARCO LLM의 endpoint와 embedding으로 "ml.g5.12xlarge"와 "ml.g5.2xlarge"를 사용하고 있으므로, 더이상 사용하지 않을 경우에 반드시 삭제하여야 합니다. 특히 cdk destroy 명령어로 Chatbot만 삭제할 경우에 SageMaker Endpoint가 유지되어 지속적으로 비용이 발생될 수 있습니다. 이를 위해 [Endpoint Console](https://us-west-2.console.aws.amazon.com/sagemaker/home?region=us-west-2#/endpoints)에 접속해서 Endpoint를 삭제합니다. 마찬가지로 [Models](https://us-west-2.console.aws.amazon.com/sagemaker/home?region=us-west-2#/models)과 [Endpoint configuration](https://us-west-2.console.aws.amazon.com/sagemaker/home?region=us-west-2#/endpointConfig)에서 설치한 VARCO LLM의 Model과 Configuration을 삭제합니다.




## 결론

엔씨소프트의 한국어 언어모델인 VARCO LLM과 Amazon OpenSearch를 활용하여 질문과 답변(Question/Answering) 테스크를 수행하는 Chatbot 어플리케이션을 구현하였습니다. 대규모 언어 모델(LLM)을 활용하면 기존 Rule 기반의 Chatbot보다 훨씬 강화된 기능을 제공할 수 있습니다. 대규모 언어모델 확습에 포함되지 못한 특정 영역의 데이터는 Amazon OpenSearch를 통해 보완될수 있으며, 이를 통해 질문과 답변을 chatbot으로 제공하려는 기업들이 유용하게 사용될 수 있을것으로 보여집니다. 또한 대규모 언어 모델을 개발하는 프레임워크인 LangChain을 VARCO LLM과 연동하는 방법과 Amazon OpenSearch와 관련된 서빙 인프라를 AWS CDK를 활용하여 쉽게 구현할 수 있었습니다. 한국어 대규모 언어 모델은 Chatbot뿐 아니라 향후 다양한 분야에서 유용하게 활용될 수 있을것으로 기대됩니다.



## Reference

[NC - github](https://ncsoft.github.io/ncresearch/varco-llm/)

[Deploy VARCO LLM Model 13B IST Package from AWS Marketplace](https://github.com/ncsoft/ncresearch/blob/main/notebooks/varco_model_13_IST.ipynb)

### invode_endpoint API 사용 예제
LangChain없이 API를 이용하여 아래와 같이 응답을 얻을 수 있습니다.

```python
payload = {
    "text": text,
    "request_output_len": 512,
    "repetition_penalty": 1.1,
    "temperature": 0.9,
    "top_k": 50,
    "top_p": 0.9
}

client = boto3.client('runtime.sagemaker')
response = client.invoke_endpoint(
    EndpointName = endpoint_name,
    ContentType = 'application/json',
    Body = json.dumps(payload).encode('utf-8'))

response_payload = json.loads(response['Body'].read())

msg = response_payload['result'][0]
```

### embedding test example

invoke_endpoint을 이용해 테스트 하는 방법입니다. 

```python
def test_embedding():
    text1 = "How cute your dog is!"
    text2 = "Your dog is so cute."
    text3 = "The mitochondria is the powerhouse of the cell."

    newline, bold, unbold = '\n', '\033[1m', '\033[0m'
    #endpoint_name = 'jumpstart-dft-embedding-gpt-j-6b-varco'
        
    payload = {"text_inputs": [text1, text2, text3]}

    encoded_json = json.dumps(payload).encode('utf-8')

    client = boto3.client('runtime.sagemaker')
    query_response = client.invoke_endpoint(EndpointName=endpoint_embedding, ContentType='application/json', Body=encoded_json)

    model_predictions = json.loads(query_response['Body'].read())
    embeddings = model_predictions['embedding']
    
    print("embeddings: ", embeddings[0][:5])

test_embedding()
```

이때의 결과는 아래와 같습니다.

```text
embeddings:  [0.0013134770561009645, -0.018332622945308685, -0.01694120466709137, -0.009232349693775177, 0.015922974795103073]
```

LangChain으로 테스트 하는 방법입니다.

```
from typing import Dict, List
class ContentHandler2(EmbeddingsContentHandler):
    content_type = "application/json"
    accepts = "application/json"

    def transform_input(self, inputs: List[str], model_kwargs: Dict) -> bytes:
        input_str = json.dumps({"text_inputs": inputs, **model_kwargs})
        return input_str.encode("utf-8")

    def transform_output(self, output: bytes) -> List[List[float]]:
        response_json = json.loads(output.read().decode("utf-8"))
        return response_json["embedding"]

content_handler2 = ContentHandler2()
embeddings = SagemakerEndpointEmbeddings(
    endpoint_name = endpoint_embedding,
    region_name = embedding_region,
    content_handler = content_handler2,
)

embeded = embeddings.embed_documents(
    [
        "Hi there!",
        "Oh, hello!",
        "What's your name?",
        "My friends call me World",
        "Hello World!"
    ]
)
print('embeded length: ', len(embeded))
print('embeded: ', embeded[0][:5])

embedded_query = embeddings.embed_query("What was the name mentioned in the conversation?")
print("embedded_query: ", embedded_query[:5])
```

이때의 결과는 아래와 같습니다.

```text
embeded length:  5
embeded:  [0.013767411932349205, -0.004349768161773682, -0.01514718122780323, -0.024414923042058945, 0.0014429446309804916]
embedded_query:  [0.01781562715768814, -0.010036011226475239, 0.0072834971360862255, 0.0027703342493623495, 0.01133547443896532]
```

