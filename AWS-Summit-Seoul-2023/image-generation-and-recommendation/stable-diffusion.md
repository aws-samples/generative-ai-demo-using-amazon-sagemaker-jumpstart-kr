# Stable Diffusion 이미지 생성하기

## Stable Diffusion 이미지를 생성하는 API

API의 Resouce는 '/text2image'으로 아래와 같이 CloudFront Domain을 활용하여 RESTful API의 POST method로 요청합니다.

```java
https://d3ic6ryvcaoqdy.cloudfront.net/emotion
```

이것을 구현하기 위한 java script 예제 코드는 아래와 같습니다. response의 'body'에 생성된 이미지의 URL들이 내려옵니다.

```java
const uri = "https://d3ic6ryvcaoqdy.cloudfront.net/text2image";
const xhr = new XMLHttpRequest();

xhr.open("POST", uri, true);
xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status === 200) {
        response = JSON.parse(xhr.responseText);
        console.log("response: " + response);
        result = JSON.parse(response.body);
        console.log("result: " + result);                    

        console.log("result1: " + JSON.stringify(result[0]));
        console.log("result2: " + JSON.stringify(result[1]));
        console.log("result3: " + JSON.stringify(result[2]));
        console.log("result4: " + JSON.stringify(result[3]));
    }
};

var requestObj = {"text":text}
console.log("request: " + JSON.stringify(requestObj));

var blob = new Blob([JSON.stringify(requestObj)], {type: 'application/json'});
xhr.send(blob); 
```


## Stable Diffusion 이미지를 Parallel Processing을 이용해 생성하기

Stable Diffusion 이미지를 생성하기 위한 Architecture는 아래와 같습니다. 여기서는 데모의 원할한 진행을 위하여 여러개의 Endpoint를 만들어서 실행속도를 향상합니다. p3 2xlarge로 진행시 endpoint로 진행시 약 50초정도 소요되지만, 2개의 p3 2xlarge로 진행시는 14초 소요됩니다. 

<img width="716" alt="image" src="https://user-images.githubusercontent.com/52392004/220714782-1dc0a2e8-de35-4f53-8ebb-9b2a915a749b.png">


병렬처리 관련된 python 코드는 아래와 같습니다.

```python
procs = []    
urls = []
for num in range(0,nproc): # 2 processes
    proc = Process(target=stable_diffusion, args=(num, txt, mybucket, fname, endpoints[num],))
    urls.append("https://"+domain+'/'+fname+'_'+str(num)+'.jpeg')    
    procs.append(proc)
    proc.start()
        
for proc in procs:
    proc.join()

print("urls: ", urls)
```



### 시험 결과의 예 

- happy 

```java
A flower, fantasy, happy, young, smile, concept art, trending on artstation, highly detailed, intricate, sharp focus, digital art, 8 k
```

<img width="814" alt="image" src="https://user-images.githubusercontent.com/52392004/220794172-ff8e29ae-381c-475c-b968-f88cec6ee908.png">

- unhappy

```java
- A flower, fantasy, unhappy, young, smile, concept art, trending on artstation, highly detailed, intricate, sharp focus, digital art, 8 k
```
<img width="818" alt="image" src="https://user-images.githubusercontent.com/52392004/220794856-9910072d-0bf6-465b-af11-ac70923d18b7.png">

- very happy, immature

```java
A flower, fantasy, very happy, immature, smile, concept art, trending on artstation, highly detailed, intricate, sharp focus, digital art
```

<img width="817" alt="image" src="https://user-images.githubusercontent.com/52392004/220795334-92ca5cfb-4ffb-44f2-9eac-45797a57dd24.png">


브라우저에서 WebUrl인 "https://d3ic6ryvcaoqdy.cloudfront.net/text2image.html" 로 접속합니다. 아래처럼 prompt를 변경하고 Send를 선택하여 Stable Image를 생성합니다.

![noname](https://user-images.githubusercontent.com/52392004/220824739-764a848a-d98c-4884-847c-8b8b12ecbf90.png)


## Stable Diffusion Image Generator

[이미지 생성](https://github.com/kyopark2014/emotion-garden/blob/main/image-generator.md)에서는 다수의 이미지 생성 및 관리 방법에 대해 설명합니다.


## ETC

- A flower with cat, fantasy, very happy, immature, smile, concept art, trending on artstation, highly detailed, intricate, sharp focus, digital art

<img width="1427" alt="image" src="https://user-images.githubusercontent.com/52392004/220819859-0c211084-6feb-4032-a365-b960044942a4.png">
