# 추천 리스트 읽어오기

[lambda-garden](./lambda-garden/index.js)에서는 사용자의 id를 가지고 해당 사용자에 대한 추천 이미지 리스트를 가져올 수 있습니다.

PersonalizeRuntime을 이용하여 추천정보를 가져올 수 있습니다.

```java
const aws = require('aws-sdk');
const personalizeRuntime = new aws.PersonalizeRuntime();
```

Personalize에 데이터 import후에 solution을 생성한다음에 campain을 배포하면, campaignArn을 얻어올 수 있습니다.

```java
const campaignArn = process.env.campaignArn
```

personalizeRuntime.getRecommendations()을 이용하여 userId에 대한 추천 리스트를 가져옵니다.

```java
    let userId = body['id'];
    
    let recommendationParams = {
        campaignArn: campaignArn,
        userId: userId
    };

    let recommendation; 
    try {
        recommendation = await personalizeRuntime.getRecommendations(recommendationParams).promise();
        console.log ('recommendation: ', JSON.stringify(recommendation));
    } catch (error) {
        console.log(error);
        return;
    }  
```

추천정보는 itemList로 내려오므로 "recommendation['itemList']"로 리스트 정보를 확인할 수 있습니다. landscape와 portrait로 구분하여 url을 생성후 리턴합니다. 

```java
    for(let i in recommendation['itemList']) {
        let itemStr = recommendation['itemList'][i].itemId;
        console.log("itemStr: ", itemStr);

        let pos = itemStr.indexOf('.jpeg');
        // console.log("url: ", itemStr);
        // console.log("pos: ", pos);
        
        let identifier = itemStr[pos - 1];
        // console.log("identifier: ", identifier);    

        const url = 'https://'+domainName+'/'+itemStr;
        console.log('url: ', url);

        const imgProfile = {
            url: url,
            emotion: emotion,
            // control: control
        }

        if (identifier == 'v') {
            portrait.push(imgProfile);
        }
        else {
            landscape.push(imgProfile);
        }
    }

    let result = {
        landscape: landscape,
        portrait: portrait
    }
    
    let response = {
        statusCode: 200,
        body: JSON.stringify(result)
    };

    return response;
```    
