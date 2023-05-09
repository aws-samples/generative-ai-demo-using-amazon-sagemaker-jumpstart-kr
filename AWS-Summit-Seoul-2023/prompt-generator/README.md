# Prompt Generator

My Emotion Gardens에 사용될 이미지 생성을 위해 사용한 Prompt Generator 입니다. Promot 생성에 사용될 감정을 선택하면 미리 정의해놓은 Prompt 템플릿이 생성됩니다. 그리고 생성된 템플릿의 각 Place Holder에 들어갈 값들을 [동물], [날씨], [계절], [시간] 에서 선택하고 [시작]을 누르면 Prompt 템플릿과 선택한 값들의 조합으로 Prompt를 생성합니다.

<img width="800" src="https://github.com/aws-samples/generative-ai-demo-using-amazon-sagemaker-jumpstart-kr/assets/1788481/50a9e4db-6120-4dbe-b949-528f685babfa">

생성된 Promot 는 아래와 같으며 [Bulk Generator] 버튼을 누르면 /bulk API 를 호출하여 모든 생성된 모든 프롬프트의 이미지를 생성합니다.

<img width="800" src="https://github.com/aws-samples/generative-ai-demo-using-amazon-sagemaker-jumpstart-kr/assets/1788481/ddd72e52-988e-4d9a-b622-9afc91154b77">

## 사용된 라이브러리
Tabulator(MIT License) https://tabulator.info/