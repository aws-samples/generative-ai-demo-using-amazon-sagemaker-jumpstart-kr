# 인프라 설치하기

## Bedrock 사용 권한 설정하기

본 실습에서는 Bedrock은 us-west-2 (Oregon) 리전을 사용합니다. [Model access](https://us-west-2.console.aws.amazon.com/bedrock/home?region=us-west-2#/modelaccess)에 접속해서 [Edit]를 선택하여 모든 모델을 사용할 수 있도록 설정합니다. 또한, 기본 인프라(Lambda, API Gateway, S3)와 Kendra는 ap-northeast-1 (Tokyo)리전을 사용합니다.

![image](https://github.com/kyopark2014/question-answering-chatbot-with-vector-store/assets/52392004/112fa4f6-680b-4cbf-8018-3bef6514ccf3)



## CDK를 이용한 인프라 설치하기


여기서는 [Cloud9](https://aws.amazon.com/ko/cloud9/)에서 [AWS CDK](https://aws.amazon.com/ko/cdk/)를 이용하여 인프라를 설치합니다.

1) [Cloud9 Console](https://ap-northeast-1.console.aws.amazon.com/cloud9control/home?region=ap-northeast-1#/create)에 접속하여 [Create environment]-[Name]에서 “chatbot”으로 이름을 입력하고, EC2 instance는 “m5.large”를 선택합니다. 나머지는 기본값을 유지하고, 하단으로 스크롤하여 [Create]를 선택합니다.

![noname](https://github.com/kyopark2014/chatbot-based-on-Falcon-FM/assets/52392004/7c20d80c-52fc-4d18-b673-bd85e2660850)

2) [Environment](https://ap-northeast-1.console.aws.amazon.com/cloud9control/home?region=ap-northeast-1#/)에서 “chatbot”를 [Open]한 후에 아래와 같이 터미널을 실행합니다.

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
git clone https://github.com/kyopark2014/rag-chatbot-using-bedrock-claude-and-kendra
```

5) cdk 폴더로 이동하여 필요한 라이브러리를 설치합니다.

```java
cd rag-chatbot-using-bedrock-claude-and-kendra/cdk-rag-chatbot-with-kendra/ && npm install
```

6) CDK 사용을 위해 Boostraping을 수행합니다.

아래 명령어로 Account ID를 확인합니다.

```java
aws sts get-caller-identity --query Account --output text
```

아래와 같이 bootstrap을 수행합니다. 여기서 "account-id"는 상기 명령어로 확인한 12자리의 Account ID입니다. bootstrap 1회만 수행하면 되므로, 기존에 cdk를 사용하고 있었다면 bootstrap은 건너뛰어도 됩니다.

```java
cdk bootstrap aws://account-id/ap-northeast-1
```

7) 인프라를 설치합니다.

```java
cdk deploy --all
```

설치가 완료되면 아래와 같이 Output을 확인할 수 있습니다. 

![noname](https://github.com/kyopark2014/rag-chatbot-using-bedrock-claude-and-kendra/assets/52392004/aaf5c20b-2b77-4a4f-afc1-bf5fa5d1b99f)


8) HTML 파일을 S3에 복사합니다.

아래와 같이 Output의 HtmlUpdateCommend을 터미널에 붙여넣기해서 필요한 파일을 S3로 업로드합니다.

![noname](https://github.com/kyopark2014/rag-chatbot-using-bedrock-claude-and-kendra/assets/52392004/3428efb9-a41c-45cf-96de-c3bd0f7b740a)


9) FAQ를 생성하기 위하여 아래와 같이 Output의 FAQUpdateforkoreanchatbot를 복사해서 터미널에 붙여넣기 합니다.

![noname](https://github.com/kyopark2014/rag-chatbot-using-bedrock-claude-and-kendra/assets/52392004/fce5192f-93de-4ed8-a32e-8ba133d1c392)


Kendra console의 [FAQs]에 접속하면 아래와 같이 "FAQ_banking"로 Sample FAQ가 등록된것을 확인할 수 있습니다.

![noname](https://github.com/kyopark2014/rag-chatbot-using-bedrock-claude-and-kendra/assets/52392004/93d8da15-5f2d-4122-a9b2-5aa1e03ddd09)


10) Output의 WebUrlforragchatbotwithkendra에 있는 URL을 복사하여 웹브라우저로 접속합니다. User Id로 적당한 이름을 넣고, Conversation Type으로는 "2. Question/Answering (RAG-Kendra)"를 선택합니다.

![noname](https://github.com/kyopark2014/rag-chatbot-using-bedrock-claude-and-kendra/assets/52392004/3635bad9-972c-4f6d-aa83-4a06368c6fe9)



