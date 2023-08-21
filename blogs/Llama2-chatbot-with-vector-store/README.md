# SageMaker JumpStart와 Vector Store를 이용하여 Llama 2로 Chatbot 만들기

여기서는 [Llama 2의 대규모 언어 모델(Large Language Models)](https://aws.amazon.com/ko/blogs/machine-learning/llama-2-foundation-models-from-meta-are-now-available-in-amazon-sagemaker-jumpstart/)을 이용하여 질문/답변(Question/Answering)을 수행하는 chatbot을 [vector store](https://python.langchain.com/docs/modules/data_connection/vectorstores/)를 이용하여 구현합니다. 대량의 데이터로 사전학습(pretrained)한 대규모 언어 모델(LLM)은 학습되지 않은 질문에 대해서도 가장 가까운 답변을 맥락(context)에 맞게 찾아 답변할 수 있습니다. 이는 기존의 Rule 방식보다 훨씬 정답에 가까운 답변을 제공하지만, 때로는 매우 그럴듯한 잘못된 답변(hallucination)을 할 수 있습니다. 이런 경우에 [파인 튜닝(fine tuning)](https://docs.aws.amazon.com/sagemaker/latest/dg/jumpstart-foundation-models-fine-tuning.html)을 통해 정확도를 높일 수 있으나, 계속적으로 추가되는 데이터를 매번 파인 튜닝으로 처리할 수 없습니다. 따라서, [RAG(Retrieval-Augmented Generation)](https://docs.aws.amazon.com/ko_kr/sagemaker/latest/dg/jumpstart-foundation-models-customize-rag.html)와 같이 기본 모델의 파라미터(weight)을 바꾸지 않고, 지식 데이터베이스(knowledge Database)에서 얻어진 외부 지식을 이용하여 정확도를 개선하는 방법을 활용할 수 있습니다. RAG는 [prompt engineering](https://docs.aws.amazon.com/sagemaker/latest/dg/jumpstart-foundation-models-customize-prompt-engineering.html) 기술 중의 하나로서 vector store를 지식 데이터베이스로 이용하고 있습니다. 

Vector store는 이미지, 문서(text document), 오디오와 같은 구조화 되지 않은 컨텐츠(unstructured content)를 저장하고 검색할 수 있습니다. 특히 대규모 언어 모델(LLM)의 경우에 embedding을 이용하여 텍스트들의 연관성(sementic meaning)을 벡터(vector)로 표현할 수 있으므로, 연관성 검색(sementic search)을 통해 질문에 가장 가까운 답변을 찾을 수 있습니다. 여기서는 대표적인 In-memory vector store인 [Faiss](https://github.com/facebookresearch/faiss/wiki/Getting-started)와 persistent store이면서 대용량 병렬처리가 가능한 [Amazon OpenSearch](https://medium.com/@pandey.vikesh/rag-ing-success-guide-to-choose-the-right-components-for-your-rag-solution-on-aws-223b9d4c7280)를 이용하여 문서의 내용을 분석하고 연관성 검색(sementic search) 기능을 활용합니다. 이를 통해, 파인 튜닝없이 대규모 언어 모델(LLM)의 질문/답변(Question/Answering) 기능(Task)을 향상 시킬 수 있습니다.

## 아키텍처 개요

전체적인 아키텍처는 아래와 같습니다. 사용자가 [Amazon S3](https://aws.amazon.com/ko/s3/)에 업로드한 문서는 embedding을 통해 vector store에 저장됩니다. 이후 사용자가 질문을 하면 vector store를 통해 질문에 가장 가까운 문장들을 받아오고 이를 기반으로 prompt를 생성하여 대규모 언어 모델(LLM)에 질문을 요청하게 됩니다. 만약 vector store에서 질문에 가까운 문장이 없다면 대규모 언어 모델(LLM)의 Endpoint로 질문을 전달합니다. 대용량 파일을 S3에 업로드 할 수 있도록 [presigned url](https://docs.aws.amazon.com/ko_kr/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)을 이용하였고, 질문과 답변을 수행한 call log는 [Amazon DynamoDB](https://aws.amazon.com/ko/dynamodb/)에 저장되어 이후 데이터 수집 및 분석에 사용됩니다. 여기서 대용량 언어 모델로 Llama 2를 이용합니다. Llama2는 [Open LLM Leaderboard](https://huggingface.co/spaces/HuggingFaceH4/open_llm_leaderboard)에서 2023년 8월 현재 상위권에 있을만큼 강력하며, 범용적인 목적을 위해 사용될 수 있습니다. 또한 [LangChain을 활용](https://python.langchain.com/docs/get_started/introduction.html)하여 Application을 개발하였고, chatbot을 제공하는 인프라는 [AWS CDK](https://aws.amazon.com/ko/cdk/)를 통해 배포합니다. 

<img src="https://github.com/kyopark2014/Llama2-chatbot-with-vector-store/assets/52392004/e54d2e2b-1a2a-459d-af00-1afc323a20ff" width="800">


문서파일을 업로드하여 vector store에 저장하는 과정은 아래와 같습니다.

1) 사용자가 파일 업로드를 요청합니다. 이때 사용하는 Upload API는 [lambda (upload)](./lambda-upload/index.js)에 전달되어 S3 presigned url을 생성하게 됩니다.
2) 사용자가 presigned url로 문서를 업로드 하면 S3에 object로 저장됩니다.
3) Chat API에서 request type을 "document"로 지정하면 [lambda (chat)](./lambda-chat/lambda_function.py)는 S3에서 object를 로드하여 텍스트를 추출합니다.
4) Embeding을 통해 단어들을 vector화 합니다.
5) Vector store에 문서를 저장합니다. 이때 RAG의 type이 "faiss"이면 in-memory store인 Faiss로 저장하고, "opensearch"이면 Amazon OpenSearch로 저장합니다.
6) 채팅창에 업로드한 문서의 요약(Summerization)을 보여지기 위해 summerization을 수행하고 그 결과를 사용자에게 전달합니다.

아래는 문서 업로드시의 sequence diagram입니다. 

![seq-upload](./sequence/seq-upload.png)

채팅 창에서 텍스트 입력(Prompt)를 통해 RAG를 활용하는 과정은 아래와 같습니다.
1) 사용자가 채팅창에서 질문(Question)을 입력합니다.
2) 이것은 Chat API를 이용하여 [lambda (chat)](./lambda-chat/lambda_function.py)에 전달됩니다.
3) lambda(chat)은 질문을 Embedding후에 vector store에 관련된 문장이 있는지 확인합니다.
4) Vector store가 관련된 문장을 전달하면 prompt template를 이용하여 LLM에 질문을 전달합니다. 이후 답변을 받으면 사용자에게 결과를 전달합니다.

아래는 vectore store를 이용한 메시지 동작을 설명하는 sequence diagram입니다. 

![seq-chat](./sequence/seq-chat.png)

## 주요 구성

### LangChain 이용하기

LangChain을 이용해서 Llama 2에 연결하는 경우에 아래와 같이 endpoint_kwargs에 CustomAttributes를 추가합니다. 

```python
endpoint_name = os.environ.get('endpoint')

class ContentHandler(LLMContentHandler):
    content_type = "application/json"
    accepts = "application/json"

    def transform_input(self, prompt: str, model_kwargs: dict) -> bytes:
        input_str = json.dumps({
            "inputs" : 
            [
                [
                    {
                        "role" : "system",
                        "content" : "You are a kind robot."
                    },
                    {
                        "role" : "user", 
                        "content" : prompt
                    }
                ]
            ],
            "parameters" : {**model_kwargs}})
        return input_str.encode('utf-8')
      
    def transform_output(self, output: bytes) -> str:
        response_json = json.loads(output.read().decode("utf-8"))
        return response_json[0]["generation"]["content"]

content_handler = ContentHandler()
aws_region = boto3.Session().region_name
client = boto3.client("sagemaker-runtime")
parameters = {
    "max_new_tokens": 256, 
    "top_p": 0.9, 
    "temperature": 0.6
} 

llm = SagemakerEndpoint(
    endpoint_name = endpoint_name, 
    region_name = aws_region, 
    model_kwargs = parameters,
    endpoint_kwargs={"CustomAttributes": "accept_eula=true"},
    content_handler = content_handler
)
```

### Embedding

[SageMaker Endpoint Embeddings](https://python.langchain.com/docs/integrations/text_embedding/sagemaker-endpoint)에 따라 아래와 같이 embedding을 정의합니다. 여기서 embedding용 SageMaker Endpoint인 endpoint_embedding는 SageMaker JumpStart에서 "GPT-J 6B Embedding FP16"을 설치한 후에 생성된 Endpoint입니다.

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
    region_name = aws_region,
    content_handler = content_handler2,
)
```
### 문서 읽어오기

[Client](https://github.com/kyopark2014/question-answering-chatbot-with-vector-store/blob/main/html/chat.js)에서 Upload API로 아래와 같이 업로드할 파일명과 Content-Type을 전달합니다.

```java
{
    "filename":"gen-ai-wiki.pdf",
    "contentType":"application/pdf"
}
```

[Lambda-upload](./lambda-upload/index.js)에서는 용량이 큰 문서 파일도 S3에 업로드할 수 있도록 presigned url을 생성합니다. 아래와 같이 s3Params를 지정하고 [getSignedUrlPromise](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getSignedUrlPromise-property)을 이용하여 url 정보를 Client로 전달합니다.

```java
const URL_EXPIRATION_SECONDS = 300;
const s3Params = {
    Bucket: bucketName,
    Key: s3_prefix+'/'+filename,
    Expires: URL_EXPIRATION_SECONDS,
    ContentType: contentType,
};

const uploadURL = await s3.getSignedUrlPromise('putObject', s3Params);
```

Client에서 아래와 같은 응답을 얻으면 "UploadURL"을 추출하여 문서 파일을 업로드합니다.

```java
{
   "statusCode":200,
   "body":"{\"Bucket\":\"storage-for-qa-chatbot-with-rag\",\"Key\":\"docs/gen-ai-wiki.pdf\",\"Expires\":300,\"ContentType\":\"application/pdf\",\"UploadURL\":\"https://storage-for-qa-chatbot-with-rag.s3.ap-northeast-2.amazonaws.com/docs/gen-ai-wiki.pdf?Content-Type=application%2Fpdf&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAZ3KIXN5TBIBMQXTK%2F20230730%2Fap-northeast-2%2Fs3%2Faws4_request&X-Amz-Date=20230730T055129Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEAYaDmFwLW5vcnRoZWFzdC0yIkcwRQIhAP8or6Pr1lDHQpTIO7cTWPsB7kpkdkOdsrd2NbllPpsuAiBlV...(중략)..78d1b62f1285e8def&X-Amz-SignedHeaders=host\"}"
}
```

파일 업로드가 끝나면, [Client](./html/chat.js)는 Chat API로 문서를 vector store에 등록하도록 아래와 같이 요청합니다. 

```java
{
   "user-id":"f642fd39-8ef7-4a77-9911-1c50608c2831",
   "request-id":"d9ab57ad-6950-412e-a492-1381eb1f2642",
   "type":"document",
   "body":"gen-ai-wiki.pdf"
}
```

[Lambda-chat](./lambda-chat/lambda_function.py)에서는 type이 "document" 이라면, S3에서 아래와 같이 파일을 로드하여 text를 분리합니다.

```python
s3r = boto3.resource("s3")
doc = s3r.Object(s3_bucket, s3_prefix + '/' + s3_file_name)

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
```

이후 chunk size로 분리한 후에 Document를 이용하여 문서로 만듧니다.

```python
from langchain.docstore.document import Document

text_splitter = RecursiveCharacterTextSplitter(chunk_size = 1000, chunk_overlap = 100)
texts = text_splitter.split_text(new_contents)
print('texts[0]: ', texts[0])

docs = [
    Document(
        page_content = t
    ) for t in texts[: 3]
]
return docs
```


### Vector Store 

Faiss와 OpenSearch 방식의 선택은 [cdk-chatbot-llama2-stack.ts](./cdk-chatbot-llama2/lib/cdk-chatbot-llama2-stack.ts)에서 rag_type을 "faiss" 또는 "opensearch"로 변경할 수 있습니다. 기본값은 "opensearch"입니다.

#### Faiss

[Faiss](https://github.com/facebookresearch/faiss)는 Facebook에서 오픈소스로 제공하는 In-memory vector store로서 embedding과 document들을 저장할 수 있으며, [LangChain을 지원](https://python.langchain.com/docs/integrations/vectorstores/faiss)합니다. Faiss에서는 FAISS()를 이용하여 아래와 같이 vector store를 정의합니다. 

```python
from langchain.vectorstores import FAISS

vectorstore = FAISS.from_documents( # create vectorstore from a document
    docs, 
    embeddings  
)
```

이후, vectorstore를 이용하여 관계된 문서를 조회합니다. 이때 Faiss는 embedding된 query를 이용하여 [similarity_search_by_vector()](https://python.langchain.com/docs/modules/data_connection/vectorstores/)로 조회합니다.

```python
relevant_documents = vectorstore.similarity_search_by_vector(query_embedding)
```

문서를 추가할 경우에 아래와 같이 vector store에 추가합니다.

```python
vectorstore.add_documents(docs)
```

#### OpenSearch

[Amazon OpenSearch persistent store로는 vector store](https://python.langchain.com/docs/integrations/vectorstores/opensearch)를 구성할 수 있습니다. 비슷한 역할을 하는 persistent store로는 [Amazon RDS Postgres with pgVector](https://aws.amazon.com/about-aws/whats-new/2023/05/amazon-rds-postgresql-pgvector-ml-model-integration/), ChromaDB, Pinecone과 Weaviate가 있습니다. 

[Lambda-chat](./lambda-chat/lambda_function.py)에서 OpenSearch를 사용을 위해서는 Lambda의 Role에 아래의 퍼미션을 추가합니다.

```java
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "es:*",
            "Resource": "arn:aws:es:[region]:[account-id]:domain/[domain-name]/*"
        }
    ]
}
```

이것은 [cdk-chatbot-llama2-stack.ts](./cdk-chatbot-llama2/lib/cdk-chatbot-llama2-stack.ts)에서 아래와 같이 구현할 수 있습니다.

```typescript
const resourceArn = `arn:aws:es:${region}:${accountId}:domain/${domainName}/*`
const OpenSearchPolicy = new iam.PolicyStatement({
    resources: [resourceArn],
    actions: ['es:*'],
});

roleLambda.attachInlinePolicy( 
    new iam.Policy(this, `opensearch-policy-for-${projectName}`, {
        statements: [OpenSearchPolicy],
    }),
); 
```

OpenSearch에 대한 access policy는 아래와 같습니다.

```java
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "es:*",
      "Resource": "arn:aws:es:[region]:[account-id]:domain/[domain-name]/*"
    }
  ]
}
```

[cdk-chatbot-llama2-stack.ts](./cdk-chatbot-llama2/lib/cdk-chatbot-llama2-stack.ts)에서 아래와 같이 정의하여 OpenSearch 생성시 활용합니다.

```typescript
const resourceArn = `arn:aws:es:${region}:${accountId}:domain/${domainName}/*`
const OpenSearchAccessPolicy = new iam.PolicyStatement({
    resources: [resourceArn],
    actions: ['es:*'],
    effect: iam.Effect.ALLOW,
    principals: [new iam.AnyPrincipal()],
});
```
  
문서를 vector store인 OpenSearch에 저장할때에는 아래와 같이 [OpenSearchVectorSearch()](https://python.langchain.com/docs/integrations/vectorstores/opensearch)를 이용하여 vector store를 지정하고 문서를 추가합니다. 이때 index_name은 OpenSearch에 저장된 vector들을 검색할때 유용합니다. 여기서는 OpenSearch에 저장할때 "rag-index-[userId]-[requestId]" 형식으로 저장합니다. 이렇게 함으로써 문서를 올린 사람의 데이터만 검색할 수 있습니다. "is_aoss"는 serverless 버번의 OpenSearch를 지정합니다. 

```python
from langchain.vectorstores import OpenSearchVectorSearch

new_vectorstore = OpenSearchVectorSearch(
    index_name = "rag-index-" + userId + '-' + requestId,
    is_aoss = False,
    embedding_function = embeddings,
    opensearch_url = opensearch_url,
    http_auth=(opensearch_account, opensearch_passwd),
)
new_vectorstore.add_documents(docs) 
```

아래와 같이 OpenSearch는 [vector store로 부터 similarity_search()](https://python.langchain.com/docs/integrations/vectorstores/opensearch)를 이용하여 관련된 문서를 조회할 수 있습니다.

```python
relevant_documents = vectorstore.similarity_search(query)
```

또한, 텍스트를 질문(Qeustion)이 들어오면 OpenSearch에서 해당 사용자가 올린 문서를 가져올 수 있도록 아래와 같이 vector store를 정의합니다.

```python
vectorstore = OpenSearchVectorSearch(
    index_name = 'rag-index-'+userId+'-*',
    is_aoss = False,
    embedding_function = embeddings,
    opensearch_url=opensearch_url,
    http_auth=(opensearch_account, opensearch_passwd),
)
```

### Question/Answering

아래와 같이 vector store에 직접 Query 하는 방식과, Template를 이용하는 2가지 방법으로 Question/Answering 구현하는 것을 설명합니다.

#### Vector Store에서 query를 이용하는 방법

embedding한 query를 가지고 vectorstore에서 검색한 후에 vectorstore의 query()를 이용하여 답변을 얻습니다.

```python
wrapper_store = VectorStoreIndexWrapper(vectorstore = vectorstore)
query_embedding = vectorstore.embedding_function(query)

relevant_documents = vectorstore.similarity_search_by_vector(query_embedding)
answer = wrapper_store.query(question = query, llm = llm)
```

#### Template를 이용하는 방법

Template를 이용하는 방법은 [RetrievalQA](https://python.langchain.com/docs/use_cases/question_answering/how_to/vector_db_qa)을 이용하여, 일반적으로 vectorstore에서 query를 이용하는 방법보다 나은 결과를 얻습니다.

```python
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

query_embedding = vectorstore.embedding_function(query)
relevant_documents = vectorstore.similarity_search_by_vector(query_embedding)

    from langchain.chains import RetrievalQA
    from langchain.prompts import PromptTemplate

    prompt_template = """Human: Use the following pieces of context to provide a concise answer to the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.

{ context }

Question: { question }
Assistant: """
PROMPT = PromptTemplate(
    template = prompt_template, input_variables = ["context", "question"]
)

qa = RetrievalQA.from_chain_type(
    llm = llm,
    chain_type = "stuff",
    retriever = vectorstore.as_retriever(
        search_type = "similarity", search_kwargs = { "k": 3 }
    ),
    return_source_documents = True,
    chain_type_kwargs = { "prompt": PROMPT }
)
result = qa({ "query": query })

return result['result']
```

### AWS CDK로 인프라 구현하기

[CDK 구현 코드](./cdk-chatbot-llama2/README.md)에서는 Typescript로 인프라를 정의하는 방법에 대해 상세히 설명하고 있습니다.

## 직접 실습 해보기

### 사전 준비 사항

이 솔루션을 사용하기 위해서는 사전에 아래와 같은 준비가 되어야 합니다.

- [AWS Account 생성](https://repost.aws/ko/knowledge-center/create-and-activate-aws-account)


### CDK를 이용한 인프라 설치
[인프라 설치](https://github.com/kyopark2014/question-answering-chatbot-using-RAG-based-on-LLM/blob/main/deployment.md)에 따라 CDK로 인프라 설치를 진행합니다. 





### 실행결과

채팅창에 "Tell me how to use language model for image detection on AWS."라고 입력합니다. 대규모 언어 모델은 가장 근사한 답을 찾아서 전달하므로 전형적인 환각(hallucination) 응답을 얻었습니다.

![noname](https://github.com/kyopark2014/Llama2-chatbot-with-vector-store/assets/52392004/386f1b04-022c-4234-b5d7-3e34f9ace3da)


[gen-ai-wiki.pdf](./gen-ai-wiki.pdf)을 다운로드 한 후에 채팅창 아래의 파일 아이콘을 선택하여 업로드합니다. 업로드가 끝나면 아래와 같이 "gen-ai-wiki.pdf"을 요약하여 보여줍니다.


![noname](https://github.com/kyopark2014/Llama2-chatbot-with-vector-store/assets/52392004/fdaccc04-e719-48aa-9915-242a71a73f1f)



"gen-ai-wiki.pdf"는 AWS의 Generative AI에 대한 정보를 가지고 있으므로, 동일한 질문을 했을때에 아래와 같이 이전과 다른 정확한 답변을 얻을 수 있습니다.

![noname](https://github.com/kyopark2014/Llama2-chatbot-with-vector-store/assets/52392004/eb5aa4f6-7e7f-4d06-8151-adff47712c71)




### 리소스 정리하기

더이상 인프라를 사용하지 않는 경우에 아래처럼 모든 리소스를 삭제할 수 있습니다. [Cloud9 console](https://ap-northeast-2.console.aws.amazon.com/cloud9control/home?region=ap-northeast-2#/)에 접속하여 아래와 같이 삭제를 합니다.

```java
cdk destroy
```


## 결론

SageMaker JumpStart를 이용하여 대규모 언어 모델(LLM)인 LLama 2를 쉽게 배포하였고, vector store를 이용하여 질문과 답변(Question/Answering)을 수행하는 chatbot의 기능을 향상시켰습니다. Amazon SageMaker JumpStart는 다양한 종류의 언어 모델을 가지고 있으므로 목적에 맞게 선택하여 사용할 수 있습니다. 여기서는 Llama 2을 이용하여 RAG 동작을 구현하였고, 대용량 언어 모델의 환각(hallucination) 문제를 해결할 수 있었습니다. 또한 Chatbot 어플리케이션 개발을 위해 LangChain을 활용하였고, IaC(Infrastructure as Code)로 AWS CDK를 이용하였습니다. 대용량 언어 모델은 향후 다양한 어플리케이션에서 효과적으로 활용될것으로 기대됩니다. SageMaker JumpStart을 이용하여 대용량 언어 모델을 개발하면 기존 AWS 인프라와 손쉽게 연동하고 다양한 어플리케이션을 효과적으로 개발할 수 있습니다.



## Reference 

[Fundamentals of combining LangChain and Amazon SageMaker (with Llama 2 Example)](https://medium.com/@ryanlempka/fundamentals-of-combining-langchain-and-sagemaker-with-a-llama-2-example-694924ab0d92)

## Referecne: SageMaker Endpoint로 구현하기

SageMaker Endpoint를 직접 호출하여 prompt 응답을 받는 함수입니다.

```python
def get_llm(text):
    dialog = [{"role": "user", "content": text}]

    parameters = {
        "max_new_tokens": 256, 
        "top_p": 0.9, 
        "temperature": 0.6
    } 

    payload = {
        "inputs": [dialog], 
        "parameters":parameters
    }
    
    response = client.invoke_endpoint(
        EndpointName=endpoint_name, 
        ContentType='application/json', 
        Body=json.dumps(payload).encode('utf-8'),
        CustomAttributes="accept_eula=true",
    )                

    body = response["Body"].read().decode("utf8")
    body_resp = json.loads(body)
    print(body_resp[0]['generation']['content'])

    return body_resp[0]['generation']['content']
```
