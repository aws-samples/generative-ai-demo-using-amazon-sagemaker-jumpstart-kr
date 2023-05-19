# 이미지 생성

## Image Generator로 이미지 생성 및 선택하기

### 이미지 생성

Output의 "ImageGenerator"에 있는 URL로 접속합니다. 아래와 같이 "RepeatCount"을 30으로 설정하고, "Emotion"으로 "행복(HAPPY)"을 선택한 후에 [Generate] 버튼을 선택합니다. 이미지 생성 상태는 [Updata] 버튼을 통해 확인할 수 있습니다. 

![noname](https://user-images.githubusercontent.com/52392004/235281180-709590e1-806d-4da9-b643-bd617b97bec3.png)

### 이미지 선택

생성된 이미지가 적절하지 않다고 판단되면, 오른쪽의 "dislike"를 선택한 후에 [Remove]로 삭제합니다. 

Image Generator로 생성된 이미지들은 Preview에서 확인하고, 필요시 삭제할 수 있습니다. Preview의 url은 Output의 "Preview"에 있는 URL을 이용합니다. 

동일한 작업을 "놀람(SURPRISED)"등 나머지 7개 감정에 대해 수행합니다.

### 이미지를 Personalize에 반영하기

imgPool에 있는 이미지를 Cloud9으로 다운로드 합니다.

```java
cd ~/ && aws s3 cp s3://[Bucket]/imgPool/ ./imgPool/ --recursive
```
"emotions" 폴더로 생성한 이미지들을 복사합니다. 

```java
aws s3 cp ./imgPool/ s3://[Bucket]/emotions/ --recursive
```

## Sample 이미지를 이용하기

원활한 실습을 위해 Sample 이미지를 활용할 수 있습니다.
```java
cd .. && unzip samples.zip && aws s3 cp ./samples/emotions/ s3://[Bucket]/emotions/ --recursive
```
