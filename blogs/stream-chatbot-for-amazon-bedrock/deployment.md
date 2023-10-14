### CDK를 이용한 인프라 설치

여기서는 [AWS Cloud9](https://aws.amazon.com/ko/cloud9/)에서 [AWS CDK](https://aws.amazon.com/ko/cdk/)를 이용하여 인프라를 설치합니다. 또한 편의상 서울 리전을 통해 실습합니다.

1) [Cloud9 Console](https://ap-northeast-2.console.aws.amazon.com/cloud9control/home?region=ap-northeast-2#/create)에 접속하여 [Create environment]-[Name]에서 “chatbot”으로 이름을 입력하고, EC2 instance는 “m5.large”를 선택합니다. 나머지는 기본값을 유지하고, 하단으로 스크롤하여 [Create]를 선택합니다.

![image](https://github.com/kyopark2014/stream-chatbot-for-amazon-bedrock/assets/52392004/c85c2ef5-4f96-4528-b5d4-ab9d3e52324e)

2) [Environment](https://ap-northeast-2.console.aws.amazon.com/cloud9control/home?region=ap-northeast-2#/)에서 “chatbot”를 [Open]한 후에 아래와 같이 터미널을 실행합니다.

![image](https://github.com/kyopark2014/stream-chatbot-for-amazon-bedrock/assets/52392004/fcf24f93-9ab3-4905-be8d-8146c7371951)

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
curl https://github.com/aws-samples/generative-ai-demo-using-amazon-sagemaker-jumpstart-kr/tree/main/blogs/stream-chatbot-for-amazon-bedrock/stream-chatbot-for-amazon-bedrock.zip -o stream-chatbot-for-amazon-bedrock.zip && unzip stream-chatbot-for-amazon-bedrock.zip
```

5) cdk 폴더로 이동하여 필요한 라이브러리를 설치합니다.

```java
cd stream-chatbot-for-amazon-bedrock/cdk-stream-chatbot/ && npm install
```

7) CDK 사용을 위해 Boostraping을 수행합니다.

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
cdk deploy --all
```

9) 아래와 같이 webSocketUrl을 확인합니다. 여기서는 "wss://etl2hxx4la.execute-api.ap-northeast-1.amazonaws.com/dev" 입니다.

![noname](https://github.com/kyopark2014/stream-chatbot-for-amazon-bedrock/assets/52392004/a80f5e34-37e2-4249-8d42-0ddb6255ed15)


10) 아래와 같이 "/html/chat.js"파일을 열어서, endpoint를 업데이트합니다.

![noname](https://github.com/kyopark2014/stream-chatbot-for-amazon-bedrock/assets/52392004/99e03119-e8f8-4961-ab13-6f9bb149acbe)

11) 아래와 같이 "UpdateCommendforstreamchatbotsimple"에 있는 명령어를 확인합니다. 여기서는 "aws s3 cp ../html/chat.js s3://cdkstreamchatbotstack-storagestreamchatbote10ee90-sh19etaljvog"입니다.

![noname](https://github.com/kyopark2014/stream-chatbot-for-amazon-bedrock/assets/52392004/dafbcc16-2520-4541-ae41-9b43d681e71a)

아래와 같이 명령어를 입력합니다. 

![noname](https://github.com/kyopark2014/stream-chatbot-for-amazon-bedrock/assets/52392004/73aea751-c148-460c-8a54-e15589f84833)

12) 복사가 완료되면 아래와 같이 WebUrl을 이용하여 브라우저로 접속합니다.

![noname](https://github.com/kyopark2014/stream-chatbot-for-amazon-bedrock/assets/52392004/db6f9d02-91d9-4676-835e-c8d9f0a046ab)


