# Like API

이미지들에 대한 선호도를 수집하기 위한 API 입니다.

java script 예제입니다.

```java
const url = "/like";
const xhr = new XMLHttpRequest();

xhr.open("POST", url, true);
xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status === 200) {
        console.log("--> responseText: " + xhr.responseText);
    }
};

let requestObj = {
    "id": userId,
    "itemId": itemId,
    "impression": impression,
};
console.log("request: " + JSON.stringify(requestObj));

let blob = new Blob([JSON.stringify(requestObj)], { type: 'application/json' });

xhr.send(blob);
```

서버로 보내는 json 입력의 형태는 아래와 같습니다. id는 사용자의 아이디이며, itemId는 선택된 이미지에 대한 object의 key이고, impression은 화면에 표시되는 3개의 이미지에 대한 object key들입니다. Personalize에서는 3개의 이미지중에 1개의 이미지를 선호했다는 의미로 인지하게 됩니다.

```java
{
    "id": "bfc150a5-07ad-45a0-87e8-435e8a21d6ee",
    "itemId": "emotions/calm/img_20230320-121242_6h.jpeg",
    "impression": [
        "emotions/calm/img_20230320-121242_6h.jpeg",
        "emotions/calm/img_20230320-121242_3h.jpeg",
        "emotions/calm/img_20230320-00504_2h.jpeg"
    ]
}
```
