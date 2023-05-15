# Amazon SageMaker를 이용한 Generative AI Demo

생성 AI(Generative AI)를 이용한 데모의 주요 내용과 코드를 공유합니다.

## "My Emotion Gardens" (AWS Summit Seoul 2023)

"My Emotion Gardens"은 2023년 AWS Summit Seoul에서 메인 데모로 전시되었습니다.

My Emotion Gardens은 사용자 감정과 외부 날씨에 따라 변화되는 가든을 제공합니다. AI 기술을 통해 사용자의 감정을 파악하여 개인화된 정원을 이미지로 표현하며, 이 과정에서 Amazon SageMaker 의 생성AI (Generative AI) 를 사용합니다. 또한 빛, 습도, 바람 등 사용자 경험을 위한 다양한 디바이스를 AWS IoT 서비스와 연결하여 제어합니다. 사용자는 표졍 변화 뿐만 아니라 외부 환경과의 인터랙티브한 경험을 이용하여 emotion gardens 의 이미지를 생성하면서 다양한 분위기의 나만을 위한 정원을 만들 수 있습니다.

기술적인 상세한 내용은 [AWS Summit Seoul 2023](https://github.com/aws-samples/generative-ai-demo-using-amazon-sagemaker-jumpstart-kr/tree/main/AWS-Summit-Seoul-2023)에서 확인할 수 있습니다.

![IMG_0481](https://user-images.githubusercontent.com/52392004/236055374-ecdc1c2f-245f-42c7-b9f6-830927ec484c.jpg)


**AWS Summit Seoul 2023 전시 주요 현황**

- 일시: 2023년 5월 3일 ~ 4일 

- 장소: Coex 1층 B홀 Expo Booth

- 개발 및 데모: [Youngjoon Choi](https://www.linkedin.com/in/youngjoon-choi-34790634/), [Juheon Choi](https://www.linkedin.com/in/juheon-choi-a042b3118/), [John Park](https://www.linkedin.com/in/john-park-9b9a1068/), [Sanghyun Lee](https://www.linkedin.com/in/%EC%83%81%ED%98%84-%EC%9D%B4-a0442a104/), [Kichul Kim](https://www.linkedin.com/in/kichul-kim-4bb293135/), [Minjae Im](https://www.linkedin.com/in/minjae-im-22176b229/), [Tak Yong Kim](https://www.linkedin.com/in/takykim/), [Sanghyun Kim](https://www.linkedin.com/in/aws-sanghyun/), [HwiKyoung Kim](https://www.linkedin.com/in/hwikyoung-kim/), [Jungkon Kim](https://www.linkedin.com/in/%EC%A0%95%EA%B3%A4-%EA%B9%80-085ab0204/),  [JongSeon Kim](https://www.linkedin.com/in/jseonkim/)

- 전시 Suppport: 개발 인원 및 [JinHyeok Lee](https://www.linkedin.com/in/jinhyeok-lee-3ba63a125/), JinAh Kim, [Jeongwon Kim](https://www.linkedin.com/in/jeongwonkim/), Suji Lee, [Jisun Choi](https://www.linkedin.com/in/%EC%A7%80%EC%84%A0-%EC%B5%9C-5a8666a6/), [Jiyun Park](https://www.linkedin.com/in/jiyunpark-31a9bb1b6/), [Sukwon Lee](https://www.linkedin.com/in/sukwon-won-lee/), [Hojae Lee](https://www.linkedin.com/in/leehojae/), [Sejin Kim](https://www.linkedin.com/in/saygenie/)

- 이벤트 및 데모 관련 링크
1. [공식 이벤트 페이지](https://aws.amazon.com/ko/events/summits/seoul/)
2. [(Blog) 다시 돌아온 AWS Summit Seoul에 참여해 주셔서 감사합니다!](https://aws.amazon.com/ko/blogs/korea/thank-you-for-joining-aws-summit-seoul-2023/?fbclid=IwAR0lcvIBgjDFLD1RUwQ2XLG4gN0Qpbe2wUfNE7IzhIjmxoiYeULNzna8TMc)
3. [기조연설 - 데모소개는 1시간 9분 17초부터](https://www.youtube.com/watch?v=xYYHB5zfNmo)



## Generative AI
Generative AI는 인공 지능 분야의 하나로, 기존의 데이터에서 패턴을 학습하고 이를 기반으로 새로운 데이터나 새로운 콘텐츠를 생성하는 시스템을 말합니다. 이러한 시스템은 기계 학습 알고리즘을 사용하여 새로운 텍스트, 이미지, 음성 녹음 등을 생성할 수 있습니다. Generative AI는 예술, 디자인, 문학, 음악 등 다양한 분야에서 창작물을 만드는 데 활용될 수 있습니다. Generative AI 시스템은 일반적으로 대량의 데이터를 기반으로 학습됩니다. 예를 들어, 언어 모델을 학습하기 위해서는 대량의 텍스트 데이터가 필요합니다. 학습 데이터를 기반으로 모델은 데이터 내에서 패턴을 찾고, 이를 이용해 새로운 데이터를 생성할 수 있습니다.

### My Emotion Gardens 에서 생성한 이미지 예시

**입력한 프롬프트**
> botanic garden with flowers and ((dog)), very strong (((happy))) nature, best quality, ((sunny)), ((spring)), cinematic lighting, dramatic angle, wide angle view, [illustration: real artstation: 0.4], stunningly beautiful, dystopian, (day)


**생성된 이미지**
![img_20230418-05818_14h](https://github.com/aws-samples/generative-ai-demo-using-amazon-sagemaker-jumpstart-kr/assets/1788481/68694742-4490-4d80-b8c7-748195ffe20b)



## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

