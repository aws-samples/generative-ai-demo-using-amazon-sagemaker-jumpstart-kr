# 설치하기


## LLM과 Embedding Endpoint 설치하기

### LLM
여기서는 Llama 2를 설치하기 위하여  SageMaker JumbStart에서 N. Virginia(us-east-1) 리전을 이용합니다. [SageMaker Console](https://us-east-1.console.aws.amazon.com/sagemaker/home?region=us-east-1#/studio)에서 SageMaker Studio를 실행한 후에, SageMaker JumpStart에서 "Llama-2-7b-chat"를 고른후에 Deploy를 선택합니다. 설치가 되면 "jumpstart-dft-meta-textgeneration-llama-2-7b-f"와 같이 Endpoint가 생성됩니다.

![noname](https://github.com/kyopark2014/Llama2-chatbot-with-vector-store/assets/52392004/f801809f-9ea2-46b2-932a-e0586283c814)

### Embedding

[SageMaker Console](https://us-east-1.console.aws.amazon.com/sagemaker/home?region=us-east-1#/studio)에서 SageMaker Studio를 실행한 후에, SageMaker JumpStart에서 "GPT-J 6B Embedding FP16"를 고른후에 Deploy를 선택합니다. 설치가 되면 "jumpstart-dft-hf-textembedding-gpt-j-6b-fp16"와 같이 Endpoint가 생성됩니다.

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

이후 아래 명령어로 용량을 100G로 변경합니다.
```text
chmod a+rx resize.sh && ./resize.sh 100
```


4) 소스를 다운로드합니다.

```java
git clone https://github.com/kyopark2014/Llama2-chatbot-with-vector-store
```

5) cdk 폴더로 이동하여 필요한 라이브러리를 설치합니다.

```java
cd Llama2-chatbot-with-vector-store/cdk-chatbot-llama2/ && npm install
```

6) Enpoint들의 주소를 수정합니다. 

LLM과 Embedding에 대한 Endpoint 생성시 얻은 주소로 아래와 같이 "cdk-chatbot-llama2/lib/cdk-chatbot-llama2-stack.ts"을 업데이트 합니다.

![noname](https://github.com/kyopark2014/Llama2-chatbot-with-vector-store/assets/52392004/ab865bb2-7f1e-4abd-811d-867fab4d648d)



7) CDK 사용을 위해 Bootstraping을 수행합니다.

아래 명령어로 Account ID를 확인합니다.

```java
aws sts get-caller-identity --query Account --output text
```

아래와 같이 bootstrap을 수행합니다. 여기서 "account-id"는 상기 명령어로 확인한 12자리의 Account ID입니다. bootstrap 1회만 수행하면 되므로, 기존에 cdk를 사용하고 있었다면 bootstrap은 건너뛰어도 됩니다.

```java
cdk bootstrap aws://account-id/ap-northeast-2
```

8) 인프라를 설치합니다.

```java
cdk deploy
```
9) 설치가 완료되면 브라우저에서 아래와 같이 WebUrl를 확인하여 브라우저를 이용하여 접속합니다.

![noname](https://github.com/kyopark2014/Llama2-chatbot-with-vector-store/assets/52392004/1e01390d-8571-4557-8af6-7a41fd5486aa)
