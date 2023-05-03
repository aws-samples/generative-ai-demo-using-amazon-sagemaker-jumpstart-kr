# 이미지 생성기

## Stable Diffusion Image Generator

<img src="https://user-images.githubusercontent.com/52392004/224748391-2f8ff5ae-7e8e-42aa-925a-4bddd578434b.png" width="800">

1) 사용자가 CloudFront로 접속합니다.
2) S3 Origin에 있는 html, css, js를 다운로드합니다.
3) 웹페이지(bulk.html)에서 emotion, 생성하려는 갯수를 선택합니다. 
4) API Gateway로 요청이 전달됩니다.
5) 연결된 Lambda(bulk)로 요청을 전달합니다.
6) Lambda(Bulk)에서는 들어온 event에서 text를 추출하여 SQS에 push 합니다.
7) SQS를 바라보고 있는 Lambda(bulk-emotion)을 트리거합니다.
8) Lambda(bulk-emotion)이 SageMaker Enpoint로 Stable Diffusion을 요청합니다.
9) 생성된 이미지가 Lambda(bulk-emotion)으로 전달됩니다.
10) Lambda(bulk-emotion)는 이미지를 S3에 저장합니다. 이때 key값에는 emotion이 스트링으로 포함됩니다.
11) S3에 이미지가 저장될때 pubEvent를 받아서 Lambda(manager)가 DynamoDB에 저장합니다. 이때 partition key로 저장되는 이미지의 파일이름을 sort key로 emotion을 사용합니다.
12) 추후 Personalize를 통해 추천 이미지를 전달합니다.
