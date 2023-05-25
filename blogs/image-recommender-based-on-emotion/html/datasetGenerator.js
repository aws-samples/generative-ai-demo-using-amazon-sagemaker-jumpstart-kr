let emotions = [];
emotions.push("happy");
emotions.push("angry");
emotions.push("calm");
emotions.push("confused");
emotions.push("disgusted");
emotions.push("fear");
emotions.push("sad");
emotions.push("surprised");

function generateDataset(requestList) {    
    const xhr = new XMLHttpRequest();

    xhr.open("POST", "generateDataset", true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.log("--> responseText: " + xhr.responseText);

            // let response = JSON.parse(xhr.responseText)
            // console.log("response: " + response.text);                    
        }
    };

    console.log("requestList: " + JSON.stringify(requestList));

    let blob = new Blob([JSON.stringify(requestList)], { type: 'application/json' });

    xhr.send(blob);
}

let repeatCount;
let form = document.forms.input_row0;

let msglist = [];
let maxMsgItems = 100;

for (let i = 0; i < maxMsgItems; i++) {
    msglist.push(document.getElementById('msg' + i));

    // add listener        
    (function (index) {
        msglist[index].addEventListener("click", function () {
            i = index;

            // console.log('click! index: ' + index);
            console.log('click!');
        })
    })(i);
}
for (let i = 0; i < maxMsgItems; i++) {
    msglist[i].innerHTML = '';
}
    
form.elements.send.onclick = function () {
    repeatCount = document.forms.input_row0.elements.repeatCount.value;
    console.log("repeatCount: " + repeatCount);
    
    let msgCnt = 0;
    for(let cnt=0;cnt<repeatCount;cnt++) {
        let requestList = [];
        for(let i in emotions) {            
            let gender = "male";          
            let userId = `${gender}/${emotions[i]}`;
            console.log("userId: ", userId);

            let requiredDataset = {
                "userId": userId,
                "gender": gender,
                "emotion": emotions[i]
            };
            requestList.push(requiredDataset);

            gender = "female";          
            userId = `${gender}/${emotions[i]}`;
            console.log("userId: ", userId);

            requiredDataset = {
                "userId": userId,
                "gender": gender,
                "emotion": emotions[i]
            };
            requestList.push(requiredDataset);      
            
            gender = "any";          
            userId = `${gender}/${emotions[i]}`;
            console.log("userId: ", userId);

            requiredDataset = {
                "userId": userId,
                "gender": gender,
                "emotion": emotions[i]
            };
            requestList.push(requiredDataset);
        } 
        console.log("requestList: ", JSON.stringify(requestList));
         
        let htmlsrc = `<p>cnt:${msgCnt+1} --> </p><text>${JSON.stringify(requestList)}</text> `;
        msglist[msgCnt++].innerHTML = htmlsrc;

        generateDataset(requestList);   
        sleep(1000);   
    }

    let requestList = [];  
    for(let i in emotions) {  
        let gender = "others";          
        let userId = `${gender}/${emotions[i]}`;
        console.log("userId: ", userId);

        let requiredDataset = {
            "userId": userId,
            "gender": gender,
            "emotion": emotions[i]
        };
        requestList.push(requiredDataset);
    }
    let htmlsrc = `<p>cnt:${msgCnt+1} --> </p><text>${JSON.stringify(requestList)}</text> `;
    msglist[msgCnt].innerHTML = htmlsrc;
    generateDataset(requestList);   

    alert("Dataset 생성 요청이 완료되었습니다.");    
};

function sleep(ms) {
    const wakeUpTime = Date.now() + ms;
    while (Date.now() < wakeUpTime) { }
}