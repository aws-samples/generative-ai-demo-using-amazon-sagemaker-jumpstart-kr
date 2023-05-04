# 생성된 이미지를 보여주기

## 생성된 이미지들을 8개의 Display에 업데이트하는 방법

이미지를 업데이트하기 위힌 API는 '/updateDisplay'이며, HTTPS POST 방식으로 업데이트하려는 이미지를 JSON으로 전달합니다. 이대 "content-Type" Header는 "application/json"입니다. JSON 예는 아래와 같습니다. 어떤 zone인지 전달하기 위해 "zone"에 "zone1", "zone2", "zone3"의 포맷으로 정보를 전달합니다. portrait와 landscape이미지는 각각 8개씩 전달하여 현장의 디바이스 상태에 따라 선택적으로 표시할 수 있어야 합니다. 

```java
{
    "zone": "zone1",
    "portrait": [
        "emotions/happy/img_20230319-23756_3v.jpeg",
        "emotions/happy/img_20230319-24457_2v.jpeg",
        "emotions/happy/img_20230319-24457_7v.jpeg",
        "emotions/happy/img_20230319-24457_9v.jpeg",
        "emotions/happy/img_20230320-112609_3v.jpeg",
        "emotions/happy/img_20230320-114222_0v.jpeg",
        "emotions/happy/img_20230320-114222_1v.jpeg",
        "emotions/happy/img_20230320-114222_2v.jpeg"
    ],
    "landscape": [
        "emotions/happy/img_20230319-24457_9h.jpeg",
        "emotions/happy/img_20230320-112609_1h.jpeg",
        "emotions/happy/img_20230320-112609_6h.jpeg",
        "emotions/happy/img_20230320-112609_7h.jpeg",
        "emotions/happy/img_20230320-114222_0h.jpeg",
        "emotions/happy/img_20230320-114222_1h.jpeg",
        "emotions/happy/img_20230320-114222_2h.jpeg",
        "emotions/happy/img_20230320-114222_3h.jpeg"
    ]
}
```


## Edge Client 에서 이미지 가져오기

[Edge Viewer](https://d3ic6ryvcaoqdy.cloudfront.net/html/flower-viewer/flower-viewer-v2.html)를 통해 각 Edge의 Display에서 업데이트 이미지를 가져와서 보여줍니다.

![image](https://user-images.githubusercontent.com/52392004/233768379-265fb984-f5bd-4230-ad97-f0e1d9f31c75.png)

이때 사용하는 이미지의 경로는 아래와 같습니다.

```java
https://d3ic6ryvcaoqdy.cloudfront.net/html/flower-viewer/flower-viewer-v2.html
```

이때 사용하는 이미지들의 미리 지정된 위치는 아래와 같습니다. 

```java
[zone1]
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img1h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img1v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img2h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img2v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img3h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img3v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img4h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img4v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img5h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img5v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img6h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img6v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img7h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img7v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img8h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img8v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img9h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone1/img9v.jpeg

[zone2]
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img1h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img1v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img2h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img2v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img3h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img3v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img4h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img4v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img5h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img5v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img6h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img6v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img7h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img7v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img8h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img8v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img9h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone2/img9v.jpeg

[zone3]
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img1h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img1v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img2h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img2v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img3h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img3v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img4h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img4v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img5h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img5v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img6h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img6v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img7h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img7v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img8h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img8v.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img9h.jpeg
https://d3ic6ryvcaoqdy.cloudfront.net/display/zone3/img9v.jpeg
```
