# Falcon Foundation Model을 이용한 Chatbot 만들기

[2023년 6월부터 AWS 서울 리전에서 EC2 G5를 사용](https://aws.amazon.com/ko/about-aws/whats-new/2023/06/amazon-ec2-g5-instances-additional-regions/)할 수 있게 되었습니다. 여기서는 [Falcon Foundation Model](https://aws.amazon.com/ko/blogs/machine-learning/technology-innovation-institute-trains-the-state-of-the-art-falcon-llm-40b-foundation-model-on-amazon-sagemaker/)을 [Amazon SageMaker JumpStart](https://aws.amazon.com/ko/sagemaker/jumpstart/?sagemaker-data-wrangler-whats-new.sort-by=item.additionalFields.postDateTime&sagemaker-data-wrangler-whats-new.sort-order=desc)를 이용해 AWS 서울 리전의 EC2 G5에 설치하고, 웹브라우저 기반의 Chatbot을 생성하는 방법에 대해 설명합니다. Falcon FM은 SageMaker JumpStart를 통해 Endpoint를 만들고, Chatbot를 위한 제공하기 위한 API는 [AWS CDK](https://aws.amazon.com/ko/cdk/)를 이용하여 설치합니다. 생성된 Chatbot은 REST API를 통하여 텍스트로 요청을 하고 결과를 화면에 표시할 수 있습니다. 상세한 Architecture는 아래와 같습니다. 

<img src="https://github.com/kyopark2014/chatbot-based-on-Falcon-FM/assets/52392004/13c45617-9b47-4d8d-a68d-a344e0cb8bc3" width="700">

1) 사용자는 [Amazon CloudFront](https://aws.amazon.com/ko/cloudfront/)를 통해 Chatbot 웹페이지에 접속합니다. 이때 HTML, CSS, JS와 같은 리소스는 [Amazon S3](https://aws.amazon.com/ko/pm/serv-s3/?nc1=h_ls)에서 읽어옵니다.
2) 채팅 화면에서 사용자가 메시지를 입력하면, chat API가 호출되어, CloudFront로 요청을 보냅니다.
3) CloudFront는 [AWS API Gateway](https://aws.amazon.com/ko/api-gateway/)로 요청을 전달합니다.
4) API Gateway는 Chat을 담당하는 [AWS Lambda](https://aws.amazon.com/ko/lambda/)로 요청을 이벤트로 전달하게 되고, Lambda는 이벤트에서 메시지를 parsing하여 SageMaker Endpoint로 전달합니다.
5) Lambda가 SageMaker Endpoint로 요청을 전달하면 Falcon FM을 통해 요청된 텍스트에 대한 답변을 생성합니다.


## Architecture 구현하기

메시지 전송 및 PDF 파일 요약을 구성하기 위한 방법에 대해 설명합니다.

### 메시지 전송

사용자가 Chatbot UI에서 메시지를 입력하면, '/chat' API를 이용해 메시지를 전송합니다. 이때의 메시지 body의 포맷은 아래와 같습니다.

```java
{
    "text": "Building a website can be done in 10 simple steps"
}
```

사용자가 입력한 메시지는 CloudFront - API Gateway를 통해 Lambda로 전달됩니다. Lambda는 이벤트(event)에서 메시지(text)를 분리한 후에 payload를 생성합니다. 상세한 내용은 [lambda_function.py
](./lambda-chat/lambda_function.py)을 참조합니다. 여기서 payload의 parameters는 [Falcon Parameters](https://github.com/kyopark2014/chatbot-based-on-Falcon-FM/blob/main/falcon-parameters.md)을 참조합니다.

```python
text = event['text']

payload = {
    "inputs": text,
    "parameters": {
        "max_new_tokens": 512,
        "return_full_text": False,
        "do_sample": False,
        "temperature": 0.5,
        "repetition_penalty": 1.03,
        "top_p": 0.9,
        "top_k": 1,
        "stop": ["<|endoftext|>", "</s>"]
    }
}
```

아래와 같이 boto3를 이용해 endpoint로 payload를 전달하고 응답에서 generated_text를 추출합니다.

```python
client = boto3.client('runtime.sagemaker')
response = client.invoke_endpoint(
    EndpointName=endpoint_name, 
    ContentType='application/json', 
    Body=json.dumps(payload).encode('utf-8'))                
    
response_payload = json.loads(response['Body'].read())
generated_text = response_payload[0]['generated_text']
```

전달된 payload에 대한 SageMaker Endpoint의 Response 예는 아래와 같습니다.

```json
{
   "ResponseMetadata":{
      "RequestId":"80e8d6c5-0362-44a0-ab6d-bf11b2f2963e",
      "HTTPStatusCode":200,
      "HTTPHeaders":{
         "x-amzn-requestid":"80e8d6c5-0362-44a0-ab6d-bf11b2f2963e",
         "x-amzn-invoked-production-variant":"AllTraffic",
         "date":"Mon, 10 Jul 2023 07:27:42 GMT",
         "content-type":"application/json",
         "content-length":"185",
         "connection":"keep-alive"
      },
      "RetryAttempts":0
   },
   "ContentType":"application/json",
   "InvokedProductionVariant":"AllTraffic",
   "Body":<botocore.response.StreamingBody object at 0x7f0379091400>
}
```

여기서 Body는 json 포맷으로 decoding하면 아래와 같습니다.

```json
[
   {
      "generated_text":" Hello, Daniel! I've been practicing my super-power, which is to be a super-duper-super-hero of super-duper-super-duperness, that can do super-duper-heroey things"
   }
]
```


### PDF 파일 요약 

Chatbot 대화창 하단의 파일 업로드 버튼을 클릭하여 PDF 파일을 업로드하면, 중복을 피하기 위하여 UUID(Universally Unique IDentifier)를 이름으로 가지는 Object로 S3에 저장합니다. 이후 '/pdf' API를 이용해 Falcon FM에 파일 요약(Summary)을 요청합니다. 이때 요청하는 메시지의 형태는 아래와 같습니다.

```java
{
    "object": "3efe99b5-1a85-4f01-b268-10bdc7a673e7.pdf"
}
```

[lambda-pdf](./lambda-pdf-summary/lambda_function.py)와 같이 S3에서 PDF Object를 로드하여 text를 분리 합니다.

```python
s3r = boto3.resource("s3")
doc = s3r.Object(s3_bucket, s3_prefix + '/' + s3_file_name)

contents = doc.get()['Body'].read()
reader = PyPDF2.PdfReader(BytesIO(contents))

raw_text = []
for page in reader.pages:
    raw_text.append(page.extract_text())
contents = '\n'.join(raw_text)
```

여기서는 [LangChain Summation](https://python.langchain.com/docs/use_cases/summarization)을 이용하여 PDF 파읽의 내용을 요약합니다. LangChain이 SageMaker Endpoint의 입력 포맷을 읽어올 수 있도록 아래와 같이 ContentHandler Class를 정의합니다.

```python
class ContentHandler(LLMContentHandler):
    content_type = "application/json"
    accepts = "application/json"

    def transform_input(self, prompt: str, model_kwargs: dict) -> bytes:
        input_str = json.dumps({'inputs': prompt, 'parameters': model_kwargs})
        return input_str.encode('utf-8')
      
    def transform_output(self, output: bytes) -> str:
        response_json = json.loads(output.read().decode("utf-8"))
        return response_json[0]["generated_text"]

content_handler = ContentHandler()
```

이제 SageMaker Endpoint를 보도록 llm을 정의합니다.
```python
aws_region = boto3.Session().region_name
parameters = {
    "max_new_tokens": 300,
}
content_handler = ContentHandler()

llm = SagemakerEndpoint(
    endpoint_name = endpoint_name,
    region_name = aws_region,
    model_kwargs = parameters,
    content_handler = content_handler
)
```

문서의 크기가 크므로 [RecursiveCharacterTextSplitter](https://js.langchain.com/docs/modules/indexes/text_splitters/examples/recursive_character)를 이용해 chunk 단위로 분리하고 Document에 저장합니다. 이후 load_summarize_chain를 이용해 요약합니다.

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains.summarize import load_summarize_chain
from langchain import PromptTemplate, SagemakerEndpoint

new_contents = str(contents).replace("\n", " ")
text_splitter = RecursiveCharacterTextSplitter(chunk_size = 1000, chunk_overlap = 0)
texts = text_splitter.split_text(new_contents)

docs = [
    Document(
        page_content = t
    ) for t in texts[: 3]
]
prompt_template = """Write a concise summary of the following:

{ text }
        
        CONCISE SUMMARY """

PROMPT = PromptTemplate(template = prompt_template, input_variables = ["text"])
chain = load_summarize_chain(llm, chain_type = "stuff", prompt = PROMPT)
summary = chain.run(docs)
```


### 인프라 구현

[CDK 구현](https://github.com/kyopark2014/chatbot-based-on-Falcon-FM/blob/main/cdk-chatbot-falcon/README.md)은 CDK로 인프라를 구현하는 코드를 구성하는 방법에 대해 설명하고 있습니다.


## 직접 실습 해보기

### Falcon FM 설치

[Falcon Foundation Model 설치](./deploy-falcon-fm.md)에 따라 Amazon SageMaker의 JumpStart의 Falcon FM을 설치합니다.

### 인프라 설치

[AWS CDK를 이용한 인프라 설치하기](./cdk-deployment.md)에 따라 인프라를 설치하고 WEB URL로 접속합니다.



### 실행 결과 확인

1) "Building a website can be done in 10 simple steps"로 질문하면 각 단계별로 아래와 같이 답변하는것을 확인할 수 있습니다.

![image](https://github.com/kyopark2014/chatbot-based-on-Falcon-FM/assets/52392004/9b129b87-e21d-42b2-8de3-78632c62767b)


2) "Guide me how to travel from New York to LA."로 질문하면 여행방법을 설명합니다.

![image](https://github.com/kyopark2014/chatbot-based-on-Falcon-FM/assets/52392004/2b7d414c-adf0-4694-86a2-40be2483fa50)

3) 파일 아이콘을 선택하여 pdf파일을 선택하면 파일 요약 내용을 아래와 같이 확인할 수 있습니다. 여기서는 [gen-ai-wiki.pdf](./gen-ai-wiki.pdf)를 업로드 하였고 아래와 같은 요약 결과를 얻을 수 있습니다. 현재 Chatbot UI은 간단한 동작테스트용으로 업로드하는 파일은 5MB 이하로 제한됩니다.

![noname](https://github.com/kyopark2014/chatbot-based-on-Falcon-FM/assets/52392004/fd1f42fc-68f4-46f4-a4f8-55fae86ec71b)


4) Question/Answering의 경우

```text
On a given week, the viewers for a TV channel were
Monday: 6500 viewers
Tuesday: 6400 viewers
Wednesday: 6300 viewers


Question: How many viewers can we expect on Friday?
Answer: Based on the numbers given and without any more information, there is a daily decrease of 100 viewers. If we assume this trend will continue during the following days, we can expect 6200 viewers on the next day that would be Thursday, and therefore 6100 viewers on the next day that would be Friday.


Question: How many viewers can we expect on Saturday? (Think Step-by-Step)
Answer:
```

이때의 결과는 아래와 같습니다.

<img width="885" alt="image" src="https://github.com/kyopark2014/chatbot-based-on-Falcon-FM/assets/52392004/d9baf58a-232d-437f-8d39-887f05324f29">

5) Question/Answering의 경우Text Generation with simple prompt

```text
Write an email from Bob, Customer Service Manager, to the customer "John Doe" 
who provided negative feedback on the service provided by our customer support 
engineer
```

이때의 결과는 아래와 같습니다.

<img width="875" alt="image" src="https://github.com/kyopark2014/chatbot-based-on-Falcon-FM/assets/52392004/102ff2cb-641c-4bbc-8259-54fb026c7464">


6) Code generation

"Generate and return the code for each module using the programming language and programming framework requested in. Modify this code and return markdowns for each module using the suggestions in: Python Streamlit code for a banking app using DynamoDB"로 입력시 관련 코드를 생성할 수 있습니다.

![image](https://github.com/kyopark2014/chatbot-based-on-Falcon-FM/assets/52392004/fe52ffe2-5fb3-4aa4-be43-b8a219372b9f)



### 리소스 정리하기

더이상 인프라를 사용하지 않는 경우에 아래처럼 모든 리소스를 삭제할 수 있습니다. Cloud9에 접속하여 아래와 같이 삭제를 합니다.

```java
cdk destroy
```

본 실습에서는 Falcon FM 모델의 "ml.g5.2xlarge"를 사용하고 있으므로, 더이상 사용하지 않을 경우에 반드시 삭제하여야 합니다. 이를 위해 [Inference Console](https://ap-northeast-2.console.aws.amazon.com/sagemaker/home?region=ap-northeast-2#/endpoints)에 접속해서 Endpoint를 삭제합니다. 마찬가지로 [Model console](https://ap-northeast-2.console.aws.amazon.com/sagemaker/home?region=ap-northeast-2#/models)과 [Endpoint configuration](https://ap-northeast-2.console.aws.amazon.com/sagemaker/home?region=ap-northeast-2#/endpointConfig)에서 설치한 Falcon을 삭제합니다. 

## 결론

AWS 서울 리전에서 Falcon FM 기반의 Chatbot을 생성하여 텍스트에 대한 요청 및 PDF 파일의 요약(Summary)를 수행하였습니다. Falcon FM은 HuggingFace의 [Open LLM Leaderboard](https://huggingface.co/spaces/HuggingFaceH4/open_llm_leaderboard)에서 1등 (2023년 7월 기준)을 할 만큼 우수한 성능을 가지고 있고, 상용을 포함한 라이선스에도 자유롭습니다. 또한, Falcon FM은 SageMaker JumpStart에서 편리하게 설치하고 활용할 수 있으며, 이제 AWS 서울 리전에서 EC2 G5와 같은 우수한 인프라를 통해 쉽고 빠르게 개발 및 상용이 가능합니다. LLM (Large Language Models) 기반의 Chatbot은 기존 Rule-based의 Chatbot에 비하여 훨씬 우수한 대화능력을 보여주며, 또한 AWS Lambda, CloudFront, API Gateway, S3와 같은 AWS 인프라를 이용하여 쉽게 구현할 수 있습니다. 근래에 다양하고 성능 좋은 LLM들이 많이 나오고 한글도 일부 지원되고 있어서 향후 다양한 용도로 많은 활용이 기대됩니다.
