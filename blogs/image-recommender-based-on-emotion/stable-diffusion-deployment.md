# Stable Diffusion 이미지 생성

여기에서는 Stable Diffusion 이미지 생성을 위한 인프라를 설치합니다. 편의상 인프라 설치와 관련된 설명은 서울 리전을 기준으로 구성합니다. 

1) [SageMaker Studio Console](https://ap-northeast-2.console.aws.amazon.com/sagemaker/home?region=ap-northeast-2#/studio-landing)에서 [Open Studio]를 선택합니다. Studio를 처음 사용한다면 [Launch Amazon SageMaker Studio](https://docs.aws.amazon.com/sagemaker/latest/dg/studio-launch.html)에 따라 Studio를 생성합니다.

2) SageMaker Jumpstart에서 "Stable Diffusion 2 FP16"을 검색한 후에 "Open notebook"을 선택합니다.

![noname](https://user-images.githubusercontent.com/52392004/233795862-8d99e819-3295-4912-8785-73bbb451af86.png)

3) 노트북의 마지막으로 이동하여 아래와 같이 "model_predictor.delete_model()"와 "model_predictor.delete_endpoint()"을 주석처리 합니다. 

![noname](https://user-images.githubusercontent.com/52392004/235278373-d92c7c1e-998f-46a7-b8f6-b4d25b7e55b7.png)

4) 상단 메뉴의 [Run] - [Run All Cells]를 선택하여 Stable Diffusion Endopoint를 생성합니다. 전체 생성에 약 15분이 소요됩니다.

![noname](https://user-images.githubusercontent.com/52392004/233796121-b504f965-3c82-4c6e-9904-a3d9fce6de81.png)

5) Endpoint의 이름을 확인합니다.

노트북이 실행이 완료되면, [SageMaker Endpoint](https://ap-northeast-2.console.aws.amazon.com/sagemaker/home?region=ap-northeast-2#/endpoints)로 접속하여 생성된 SageMaker Endpoint의 이름을 확인합니다. 여기서는 "jumpstart-example-model-txt2img-stabili-2023-04-22-16-31-10-149"라는 Endpoint가 생성되었습니다.
