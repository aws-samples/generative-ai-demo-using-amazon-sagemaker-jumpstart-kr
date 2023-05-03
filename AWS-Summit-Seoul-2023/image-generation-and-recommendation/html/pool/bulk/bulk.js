const cloudfrntUrl = "https://d3ic6ryvcaoqdy.cloudfront.net/";

const bulkUrl = cloudfrntUrl+"bulk";
const removeUrl = cloudfrntUrl+"remove";
const clearIndexUrl = cloudfrntUrl + "clearIndex";

let selectedEmotion = document.getElementById("emoitonId");
let profileInfo_emotion = document.getElementById('status');
profileInfo_emotion.innerHTML = `<h3>Ready</h3>`;

function sendFile(prompt, fname, index) {    
    const xhr = new XMLHttpRequest();

    xhr.open("POST", bulkUrl, true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.log("--> responseText: " + xhr.responseText);

            // let response = JSON.parse(xhr.responseText)
            // console.log("response: " + response.text);                    
        }
    };

    let requestObj = {
        "index": index,
        "prompt": JSON.stringify(prompt),
        "fname": fname
    };
    console.log("request: " + JSON.stringify(requestObj));

    let blob = new Blob([JSON.stringify(requestObj)], { type: 'application/json' });

    xhr.send(blob);
}

function deleteFile(objName) {    
    const xhr = new XMLHttpRequest();

    xhr.open("POST", removeUrl, true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.log("--> responseText: " + xhr.responseText);

            // let response = JSON.parse(xhr.responseText)
            // console.log("response: " + response.text);                    
        }
    };

    let requestObj = {
        "objName": JSON.stringify(objName),
    };
    console.log("request: " + JSON.stringify(requestObj));

    let blob = new Blob([JSON.stringify(requestObj)], { type: 'application/json' });

    xhr.send(blob);
}

let form = document.forms.input_row3;
let repeatCount, fname;
let likeList = [];
let deletedList = [];
let fileList = [];

form.elements.send.onclick = function () {
    repeatCount = document.forms.input_row0.elements.repeatCount.value;
    console.log("repeatCount: " + repeatCount);

    for (let i=0;i<repeatCount*2;i++) {
        likeList[i] = true;
        deletedList[i] = false;
        fileList[i] = "";
    }

    
    console.log("emotion: " + selectedEmotion.value);

    let emotionText = document.forms.EmotionText.elements.emtoionText.value;
    console.log("emtoionText: " + emotionText);
    
    let favorite = document.forms.input_row2.elements.favorite.value;
    console.log("favorite: " + favorite);
    favorite = favorite.toLowerCase();

    let others = document.forms.input_row3.elements.others.value;
    console.log("others: " + others);

    const timestr = gettimestr();
    console.log("timestr: ", timestr);
    
    let prompt;
    if(favorite) {
        fname = 'imgPool/'+selectedEmotion.value+'/'+favorite+'/img_'+timestr;
    }
    else { 
        fname = 'imgPool/'+selectedEmotion.value+'/img_'+timestr; 
    }    

    prompt = {
        "emotion": selectedEmotion.value,
        "emotionText": emotionText,
        //"favorite": favorite,
        "favorite": "",
        "others": others
    };
    console.log("prompt: " + JSON.stringify(prompt));
    
    if (prompt) {
        for (let i = 0; i < repeatCount; i++) {
            profileInfo_emotion.innerHTML = `<h3>${i+1}/${repeatCount}</h3>`;

            sendFile(prompt, fname, i);            
            sleep(200);            
        }
    } else {
        alert("No prompt.");
    }

    alert("이미지 생성이 요청되었습니다. 이미지 한장당 22초가 소요됩니다. 전체 생성 예상 시간은 "+(22*repeatCount*2)+"초 입니다. 이후에 [Update] 버튼을 선택하면 생성된 이미지를 볼 수 있습니다.");    
};

// repeatCount=10;
// fname="emotions/happy/cat/img_20230319-131015"
let like = true;
let previewlist = [];

form.elements.remove.onclick = function () {    
    console.log("repeatCount: " + repeatCount);
    console.log("fname: " + fname);

    let dislike = [];
    for (let i=0;i<repeatCount*2;i++) {
        if(!likeList[i] && !deletedList[i]) {            
            console.log(`${cloudfrntUrl+fileList[i]} will be removed.`);

            dislike.push(fileList[i]);

            previewlist[i].innerHTML = '';

            deletedList[i] = true;
        }
    }

    // delete dislike files
    deleteFile(dislike);

    for(let i in dislike)  // remove dynamodb index
        clearIndexDynamoDB(dislike[i]);

    let message = "";
    for(let i in dislike) {
        message += dislike[i]+'\n';
    }
    alert("dislike로 설정한 이미지가 삭제되었습니다. 삭제된 이미지는 아래와 같습니다.\n"+message); 
}

form.elements.update.onclick = function () {    
    console.log("repeatCount: " + repeatCount);
    console.log("fname: " + fname);
    
    // previews
    for (let i=0;i<repeatCount*2;i++) {
        if(i<repeatCount)
            previewlist.push(document.getElementById('preview'+i+'h'));
        else
            previewlist.push(document.getElementById('preview'+i+'v'));

        // add listener        
        (function(index) {
            previewlist[index].addEventListener("click", function() {
                i = index;

                console.log('click! index: '+index);

                likeList[i] = like;

                console.log('like: '+likeList[i]+' filename: '+fileList[i]);
            });
        })(i);
    }    

    for(let i=0;i<repeatCount*2;i++) {
        let previewUrl;

        let id;
        let htmlsrc;
        if(i<repeatCount) {
            let index = i;            
            previewUrl = cloudfrntUrl+fname+'_'+index+'h.jpeg';
            id = fname+'_'+index+'h';

            fileList[i] = fname+'_'+index+'h.jpeg';

            htmlsrc = `<H5>${previewUrl}</H5>
        <img id="${id}" src="${previewUrl}" width="800"/>
        <i onclick="likeOrDislike(this)" class="fa fa-thumbs-up"></i>`;
        }
        else {
            let index = i-repeatCount;
            previewUrl = cloudfrntUrl+fname+'_'+index+'v.jpeg';
            id = fname+'_'+index+'v';

            fileList[i] = fname+'_'+index+'v.jpeg';

            htmlsrc = `<H5>${previewUrl}</H5>
        <img id="${id}" src="${previewUrl}" height="800"/>
        <i onclick="likeOrDislike(this)" class="fa fa-thumbs-up"></i>`;
        }
        console.log('previewUrl: ', previewUrl);
                
        // console.log('htmlsrc: ', htmlsrc);

        if(!deletedList[i])
            previewlist[i].innerHTML = htmlsrc;
    }    

    // alert("생성된 이미지를 볼 수 있습니다. 생성중일때는 빈칸으로 표시됩니다. 이미지 옆의 like/dislike를 선택한 후에 [Remove] 버튼을 선택하면 dislike 이미지를 삭제할 수 있습니다.");  
};

function likeOrDislike(x) {
    if(x.classList.value == "fa fa-thumbs-up fa-thumbs-down") {
        console.log('like!');
        like = true;
    }
    else    {
        console.log('dislike!');
        like = false;
    }

    x.classList.toggle("fa-thumbs-down");           
}

function sleep(ms) {
    const wakeUpTime = Date.now() + ms;
    while (Date.now() < wakeUpTime) { }
}

function gettimestr() {
    let dateObj = new Date();
    let year = dateObj.getUTCFullYear();    
    let month = dateObj.getUTCMonth() + 1; //months from 1-12    
    let monthstr;
    if(month<10) monthstr = '0'+ month;
    else monthstr = month;

    let day = dateObj.getUTCDate();
    let daystr;
    if(daystr<10) daystr = '0'+ day;
    else daystr = day;
    
    let hour = dateObj.getHours();
    let hourstr;
    if(hourstr<10) hourstr = '0'+ hour;
    else hourstr = hour;
    
    let minutes = dateObj.getMinutes();
    let minutesstr;
    if(minutes<10) minutesstr = '0'+ minutes;
    else minutesstr = minutes;
    
    let seconds = dateObj.getSeconds();
    let secondsstr;
    if(seconds<10) secondsstr = '0'+ seconds;
    else secondsstr = seconds;
    
    let timestr = year+monthstr+daystr+'-'+hourstr+minutesstr+secondsstr;
    
    return timestr;
}

function clearIndexDynamoDB(objName) {   
    const xhr = new XMLHttpRequest();

    xhr.open("POST", clearIndexUrl, true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.log("--> responseText: " + xhr.responseText);

            // let response = JSON.parse(xhr.responseText)
            // console.log("response: " + response.text);                               
        }
    };

    let requestObj = {
        "objName": objName,
    };
    console.log("request: " + JSON.stringify(requestObj));

    let blob = new Blob([JSON.stringify(requestObj)], { type: 'application/json' });

    xhr.send(blob);
}