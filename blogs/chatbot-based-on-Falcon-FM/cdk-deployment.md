# CDK를 이용한 인프라 설치하기

여기서는 [Cloud9](https://aws.amazon.com/ko/cloud9/)에서 [AWS CDK](https://aws.amazon.com/ko/cdk/)를 이용하여 인프라를 설치합니다.

1) [Cloud9 Console](https://ap-northeast-2.console.aws.amazon.com/cloud9control/home?region=ap-northeast-2#/create)에 접속하여 [Create environment]-[Name]에서 “chatbot”으로 이름을 입력하고, EC2 instance는 “m5.large”를 선택합니다. 나머지는 기본값을 유지하고, 하단으로 스크롤하여 [Create]를 선택합니다.

![noname](https://github.com/kyopark2014/chatbot-based-on-Falcon-FM/assets/52392004/7c20d80c-52fc-4d18-b673-bd85e2660850)

2) [Environment](https://ap-northeast-2.console.aws.amazon.com/cloud9control/home?region=ap-northeast-2#/)에서 “chatbot”를 [Open]한 후에 아래와 같이 터미널을 실행합니다.

![noname](https://github.com/kyopark2014/chatbot-based-on-Falcon-FM/assets/52392004/b7d0c3c0-3e94-4126-b28d-d269d2635239)

3) 소스를 다운로드합니다.

```java
git clone https://github.com/kyopark2014/chatbot-based-on-Falcon-FM
```

4) cdk 폴더로 이동하여 필요한 라이브러리를 설치합니다.

```java
cd chatbot-based-on-Falcon-FM/cdk-chatbot-falcon/ && npm install
```

5) CDK를 위해 Boostraping을 수행합니다.

아래 명령어로 Account ID를 확인합니다.

```java
aws sts get-caller-identity --query Account --output text
```

아래와 같이 bootstrap을 수행합니다. 여기서 "account-id"는 상기 명령어로 확인한 12자리의 Account ID입니다. bootstrap 1회만 수행하면 되므로, 기존에 cdk를 사용하고 있었다면 bootstrap은 건너뛰어도 됩니다.

```java
cdk bootstrap aws://account-id/ap-northeast-2
```


6) Endpoint주소를 업데이트 합니다.

Endpoint 주소는 [Falcon FM 생성](./deploy-falcon-fm.md)에서 얻은 Endpoint의 이름입니다. 아래와 같이 "chatbot-based-on-Falcon-FM/cdk-chatbot-falcon/lib/cdk-chatbot-falcon-stack.ts"를 열어서 "endpoint"의 값을 업데이트 합니다.

![noname](https://github.com/kyopark2014/chatbot-based-on-Falcon-FM/assets/52392004/960b8003-423f-43af-94b2-788a4c655a52)


6) 인프라를 설치합니다.

```java
cdk deploy
```

7) 설치가 완료되면 브라우저에서 아래와 같이 WebUrl를 확인하여 브라우저를 이용하여 접속합니다.


![noname](https://github.com/kyopark2014/chatbot-based-on-Falcon-FM/assets/52392004/dfc27dcd-3d46-4471-bcaf-04f0f709b4d3)
