# 설치하기


## LLM과 Embedding Endpoint 설치하기

여기서는 VARCO LLM을 설치하기 위하여  SageMaker JumbStart에서 Oregon(us-west-2) 리전을 이용합니다. [AWS marketplace](https://aws.amazon.com/marketplace)에 접속하여 "VARCO"로 검색합니다. 여기서 가장 최신 버전의 "VARCO LLM KO-13B-IST"을 선택합니다. 이후 아래와 같이 [Continue to Subscribe]를 선택하고, 다시 [Continue to configuration]을 선택하여 Subscribe를 합니다. 

![image](https://github.com/kyopark2014/korean-chatbot-using-varco-llm-and-opensearch/assets/52392004/aa8e1c9f-383e-4ad1-8a5c-af784b21e6cf)

이후 아래와 같이 [Available launch methods]로 [SageMaker console]을 선택한 다음에 아래로 스크롤하여 [View in Amazon SageMaker]를 선택합니다.


![image](https://github.com/kyopark2014/korean-chatbot-using-varco-llm-and-opensearch/assets/52392004/9606ee1a-1531-4f3b-91d4-a4a9fa021ef5)


아래와 같이 Model 이름으로 "varco-llm-ko-13b-ist-1"을 입력하고 아래로 스크롤하여 [Next]을 선택합니다.


![image](https://github.com/kyopark2014/korean-chatbot-using-varco-llm-and-opensearch/assets/52392004/4da77ce8-3693-44fe-a36d-bc21ac622483)


아래와 같이 [Endpoint Name]과 [Enpoint configuration name]을 "endpoint-varco-llm-ko-13b-ist-1"로 입력합니다. 


![noname](https://github.com/kyopark2014/korean-chatbot-using-varco-llm-and-opensearch/assets/52392004/c0a6a862-7fc8-4391-b10b-ade001cd8ba0)





아래로 스크롤하여 [Variants] - [Production]에서 아래와 같이 [Create production variant]을 선택합니다.

![noname](https://github.com/kyopark2014/korean-chatbot-using-varco-llm-and-opensearch/assets/52392004/4b212253-b85d-4e02-bb45-341839b36833)

이후 [Add model]에서 "varco-llm-ko-13b-ist-1"을 선택한 후에 [Save]를 선택합니다. 이후 아래와 같이 [Edit]를 선택합니다.

![noname](https://github.com/kyopark2014/korean-chatbot-using-varco-llm-and-opensearch/assets/52392004/316e9319-3d78-4744-9c56-4a3bc3e935ed)

이후 아래와 같이 [Instance type]을 "ml.g5.12xlarge"로 선택하고 [Save]를 선택합니다.

![noname](https://github.com/kyopark2014/korean-chatbot-using-varco-llm-and-opensearch/assets/52392004/85d13822-59e2-4cdc-89d8-06e1c1d694da)

이후 아래로 스크롤하여 [Create endpoint configuration]을 선택합니다. 

Endpoint configuration 생성이 성공하면, 아래로 스크롤하여 [Submit]을 선택합니다.


## Embedding

[SageMaker Console](https://us-west-2.console.aws.amazon.com/sagemaker/home?region=us-west-2#/studio)에서 SageMaker Studio를 실행한 후에, SageMaker JumpStart에서 "GPT-J 6B Embedding FP16"를 고른후에 Deploy를 선택합니다. 설치가 되면 "jumpstart-dft-hf-textembedding-gpt-j-6b-fp16"와 같이 Endpoint가 생성됩니다.

![noname](https://github.com/kyopark2014/Llama2-chatbot-with-vector-store/assets/52392004/80a24a19-3f28-4af0-b316-335df23f2bdf)


## CDK를 이용한 인프라 설치하기

여기서는 [Cloud9](https://aws.amazon.com/ko/cloud9/)에서 [AWS CDK](https://aws.amazon.com/ko/cdk/)를 이용하여 인프라를 설치합니다.

1) [Cloud9 Console](https://us-east-1.console.aws.amazon.com/cloud9control/home?region=us-east-1#/create)에 접속하여 [Create environment]-[Name]에서 “chatbot”으로 이름을 입력하고, EC2 instance는 “m5.large”를 선택합니다. 나머지는 기본값을 유지하고, 하단으로 스크롤하여 [Create]를 선택합니다.

![noname](https://github.com/kyopark2014/chatbot-based-on-Falcon-FM/assets/52392004/7c20d80c-52fc-4d18-b673-bd85e2660850)

2) [Environment](https://us-east-1.console.aws.amazon.com/cloud9control/home?region=us-east-1#/)에서 “chatbot”를 [Open]한 후에 아래와 같이 터미널을 실행합니다.

![noname](https://github.com/kyopark2014/chatbot-based-on-Falcon-FM/assets/52392004/b7d0c3c0-3e94-4126-b28d-d269d2635239)


3) EBS 크기 변경

아래와 같이 스크립트를 다운로드 합니다. 

```text
curl https://raw.githubusercontent.com/kyopark2014/technical-summary/main/resize.sh -o resize.sh
```

이후 아래 명령어로 용량을 80G로 변경합니다.
```text
chmod a+rx resize.sh && ./resize.sh 80
```


4) 소스를 다운로드합니다.

```java
git clone https://github.com/kyopark2014/korean-chatbot-using-varco-llm-and-opensearch
```

5) cdk 폴더로 이동하여 필요한 라이브러리를 설치합니다.

```java
cd korean-chatbot-using-varco-llm-and-opensearch/cdk-varco-opensearch/ && npm install
```

6) Enpoint들의 주소를 수정합니다. 

LLM과 Embedding에 대한 Endpoint 생성시 얻은 주소로 아래와 같이 "cdk-varco-opensearch/lib/cdk-varco-opensearch-stack.ts"을 업데이트 합니다. Endpoint의 이름을 상기와 동일하게 설정하였다면, 수정없이 다음 단계로 이동합니다. 


![noname](https://github.com/kyopark2014/korean-chatbot-using-varco-llm-and-opensearch/assets/52392004/099f7e52-6bb0-42a0-b982-3d9f7964c0d4)


7) CDK 사용을 위해 Bootstraping을 수행합니다.

아래 명령어로 Account ID를 확인합니다.

```java
aws sts get-caller-identity --query Account --output text
```

아래와 같이 bootstrap을 수행합니다. 여기서 "account-id"는 상기 명령어로 확인한 12자리의 Account ID입니다. bootstrap 1회만 수행하면 되므로, 기존에 cdk를 사용하고 있었다면 bootstrap은 건너뛰어도 됩니다.

```java
cdk bootstrap aws://[account-id]/us-west-2
```

8) 인프라를 설치합니다. 전체 설치를 위해 약 20분정도 소요됩니다.

```java
cdk deploy
```
9) 설치가 완료되면 브라우저에서 아래와 같이 WebUrl를 확인하여 브라우저를 이용하여 접속합니다.

![noname](https://github.com/kyopark2014/korean-chatbot-using-varco-llm-and-opensearch/assets/52392004/4f48430b-2d8f-4809-bce2-7445677df4c7)

