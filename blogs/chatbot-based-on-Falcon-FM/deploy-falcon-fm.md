# Amazon SageMaker JumpStart로 Falcon FM 설치하기

여기에서는 Amazon SageMaker JumpStart를 이용하여 Falcon Foundation Model을 설치합니다. 편의상 인프라 설치와 관련된 설명은 서울 리전(Region)을 기준으로 구성합니다.

1) SageMaker Studio Console에서 [Open Studio](https://ap-northeast-2.console.aws.amazon.com/sagemaker/home?region=ap-northeast-2#/studio-landing)를 선택합니다. Studio를 처음 사용한다면 [Launch Amazon SageMaker Studio](https://docs.aws.amazon.com/sagemaker/latest/dg/studio-launch.html)에 따라 Studio를 생성합니다.

2) SageMaker Jumpstart에서 "Falcon 7B Instruct BF16"을 검색한 후에 아래와 같이 기본값에서 [Deploy]를 선택하여 모델을 설치합니다.

![noname](https://github.com/kyopark2014/ML-langchain/assets/52392004/39611d38-93b0-4ffe-b8ff-7c87da59b25a)

3) Deploy가 끝나면, 아래와 같이 Endpoint를 확인합니다. 여기서 생성된 Endpoint의 이름은 "jumpstart-dft-hf-llm-falcon-7b-instruct-bf16"입니다.

![image](https://github.com/kyopark2014/ML-langchain/assets/52392004/74539eeb-91fc-4858-9f1d-49f85045511d)
