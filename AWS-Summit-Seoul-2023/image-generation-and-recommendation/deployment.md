# Emotion Garden 배포 방법

## Cloud9 생성 

여기서는 Tokyo Resion에서 인프라를 구축합니다. [Cloud9 Console](https://ap-northeast-1.console.aws.amazon.com/cloud9control/home?region=ap-northeast-1#/)에 접속하여 [Create environment]를 선택하여 이름으로 "Emotion Garden"을 지정하고, EC2 instance는 편의상 "m5.large"를 선택합니다. 나머지는 기본값을 유지하고, 하단으로 스크롤하여 [Create]를 선택합니다.

![noname](https://user-images.githubusercontent.com/52392004/226772045-160e70c1-ad24-4ea5-be97-2a5101392870.png)

아래와 같이 터미널을 Open합니다. 

![noname](https://user-images.githubusercontent.com/52392004/226772282-4964a05a-5b88-4f0a-81bc-2af208c880b1.png)



### CDK로 배포 

아래와 같이 코드를 다운로드합니다.

```java
git clone https://github.com/kyopark2014/emotion-garden
cd emotion-garden/cdk-emotion-garden && npm install aws-cdk-lib@2.64.0 path 
```

왼쪽 메뉴에서 "emotion-garden/cdk-emotion-garden/cdk-emotion-garden-stack.ts"을 열어서 아래의 bucket 이름을 변경합니다. 

![noname](https://user-images.githubusercontent.com/52392004/226772955-e4097752-0216-4bf4-ada6-826463d89356.png)

이제 cdk로 인프라를 설치합니다. 

```java
cdk deploy
```

설치가 다 끝나면 아래와 같은 화면이 나옵니다. 여기서  CloudFront의 모메인 이름은 "d3ic6ryvcaoqdy.cloudfront.net"이며, Emotion과 Garden을 테스트할 수 있는 Web Page등에 대한 정보를 확인할 수 있습니다.

```java
Outputs:
CdkEmotionGardenStack.EmotionWebUrl = https://d3ic6ryvcaoqdy.cloudfront.net/emotion.html
CdkEmotionGardenStack.GardenWebUrl = https://d3ic6ryvcaoqdy.cloudfront.net/garden.html
CdkEmotionGardenStack.StableDiffusionWebUrl = https://d3ic6ryvcaoqdy.cloudfront.net/text2image.html
CdkEmotionGardenStack.UpdateCommend = aws s3 cp ../html/ s3://demo-emotion-garden/html --recursive
CdkEmotionGardenStack.apiUrlemotiongarden = https://rzyoyd47yg.execute-api.ap-northeast-1.amazonaws.com/dev/
CdkEmotionGardenStack.apiemotiongardenEndpoint777935C8 = https://rzyoyd47yg.execute-api.ap-northeast-1.amazonaws.com/dev/
CdkEmotionGardenStack.curlUrlemotiongardenl = curl -X POST https://rzyoyd47yg.execute-api.ap-northeast-1.amazonaws.com/dev/text2image -H "Content-Type: application/json" -d '{"text":"astronaut on a horse"}'
CdkEmotionGardenStack.distributionDomainNameemotiongarden = d3ic6ryvcaoqdy.cloudfront.net
```

Custom Domain이 없으므로, Cloud9에서 "emotion-garden/cdk-emotion-garden/lib/cdk-emotion-garden-stack.ts"을 열어서, 아래와 같이 CloudFront의 도메인 정보를 업데이트합니다. 

![noname](https://user-images.githubusercontent.com/52392004/226774406-b3fd0981-8e47-4b7c-9860-11743247e284.png)

업데이트된 domain 정보를 반영하기 위하여 아래와 같이 다시 설치합니다.

```java
cdk deploy
```

<!--
### S3의 퍼미션 추가

[S3 console](https://s3.console.aws.amazon.com/s3/buckets?region=ap-northeast-1&region=ap-northeast-1)로 진입한 후에, 데모에 사용되는 bucket인 "demo-emotion-garden"을 선택합니다. 

이후 [Permission]메뉴에서 [Bucket policy]를 선택후 아래와 같이 수정합니다. 현재 해당 Bucket은 CloudFront의 Origin의 역할을 하고 있어서, Principle에 CloudFront가 추가되어 있지만, CloudFront를 사용하지 않을 경우에는 S3에 대한 Priciple, Action, Resouces를 추가하면 됩니다.


```java
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "personalize.amazonaws.com",
                "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity E2IK80DBQT2AVI"
            },
            "Action": [
                "s3:GetObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::demo-emotion-garden",
                "arn:aws:s3:::demo-emotion-garden/*"
            ]
        }
    ]
}
```
-->
