const cloudfrntUrl = "https://d3ic6ryvcaoqdy.cloudfront.net/";

const removeUrl = cloudfrntUrl + "removePool";
const gardenUrl = cloudfrntUrl + "retrieve";

let profileInfo_emotion = document.getElementById('status');
profileInfo_emotion.innerHTML = `<h3>Ready</h3>`;

let start = 0, nRow = 200;
let previewUrl = [];
let previewlist = [];
let isValid = true;

function drawGarden(emotionValue) {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", gardenUrl, true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.log("--> responseText: " + xhr.responseText);

            let response = JSON.parse(xhr.responseText)
            let landscape = [];
            let portrait = [];

            landscape = response['landscape'];
            console.log("landscape: " + landscape);
            portrait = response['portrait'];
            console.log("portrait: " + portrait);

            for (let i in landscape) {
                console.log(landscape[i]);
                previewUrl.push(landscape[i]);
            }

            for (let i in portrait) {
                console.log(portrait[i]);
                previewUrl.push(portrait[i]);
            }

            console.log('previewUrl length: ', previewUrl.length);
            if (previewUrl.length) {
                for (let i = 0; i < nRow; i++) {
                    if (i + start >= previewUrl.length) break;
                    console.log("previewUrl " + previewUrl[i + start].url);

                    let pos = previewUrl[i + start].url.indexOf('.jpeg');
                    // console.log("pos: ", pos);
                    let identifier = previewUrl[i + start].url[pos - 1];
                    // console.log("identifier: ", identifier);      

                    let pos2 = previewUrl[i + start].url.lastIndexOf('imgPool');
                    // console.log('pos: ', pos2);
                    fileList[i] = previewUrl[i + start].url.substring(pos2)
                    console.log("fname: ", fileList[i]);

                    let htmlsrc;
                    if (identifier == 'v') {
                        htmlsrc = `<H5>${previewUrl[i + start].url}</H5>
                        <img id="${i}" src="${previewUrl[i + start].url}" height="800"/>
                        <i onclick="likeOrDislike(this)" class="fa fa-thumbs-up"></i>`;
                    }
                    else {
                        htmlsrc = `<H5>${previewUrl[i + start].url}</H5>
                        <img id="${i}" src="${previewUrl[i + start].url}" width="800"/>
                        <i onclick="likeOrDislike(this)" class="fa fa-thumbs-up"></i>`;
                    }
                    console.log('htmlsrc: ', htmlsrc);

                    if (!deletedList[i])
                        previewlist[i].innerHTML = htmlsrc;
                }

                alert("이미지 조회를 요청되었습니다.");
                profileInfo_emotion.innerHTML = `<h3>Total: ${previewUrl.length}</h3>`;
            }
            else {
                profileInfo_emotion.innerHTML = `<h3>No Image</h3>`;
                
                initiatePreview();

                alert("이미지가 조회되지 않습니다.");
            }
        }
    };

    initiatePreview();

    let requestObj = {
        "emotion": emotionValue,
    };
    console.log("request: " + JSON.stringify(requestObj));

    let blob = new Blob([JSON.stringify(requestObj)], { type: 'application/json' });

    xhr.send(blob);
}

function removeFile(objList) {   
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
        "objName": objList,
    };
    console.log("request: " + JSON.stringify(requestObj));

    let blob = new Blob([JSON.stringify(requestObj)], { type: 'application/json' });

    xhr.send(blob);
}

let form = document.forms.input_row3;
let form2 = document.forms.input_row4;

let fname;
let likeList = [];
let deletedList = [];
let fileList = [];

form.elements.retrieve.onclick = function () {
    start = document.forms.input_row3.elements.start.value;
    start = start * 1; // string to number
    console.log("start: " + start);
    nRow = document.forms.input_row3.elements.nRow.value;
    console.log("nRow: " + nRow);

    initiatePreview();

    let selectedEmotion = document.getElementById("emoitonId");
    console.log("emotion: " + selectedEmotion.value);

  /*  let favorite = document.forms.input_row2.elements.favorite.value;
    console.log("favorite: " + favorite);
    favorite = favorite.toLowerCase(); */

    let favorite = document.getElementById("favoriteStr");
    console.log("favorite: " + favorite.value);

    let emotionValue;
    if (favorite) {
        emotionValue = selectedEmotion.value + '/' + favorite.value;
    }
    else {
        emotionValue = selectedEmotion.value;
    }

    drawGarden(emotionValue);
};

//repeatCount=10;
//fname="emotions/happy/cat/img_20230319-131015"
let like = true;

form.elements.remove.onclick = function () {
    console.log("nRow: " + nRow);

    let dislike = [];
    for (let i = 0; i < nRow; i++) {
        if (!likeList[i] && !deletedList[i]) {
            console.log(`${cloudfrntUrl + fileList[i]} will be removed.`);

            dislike.push(fileList[i]);

            previewlist[i].innerHTML = '';

            deletedList[i] = true;
        }
    }

    // remove dislike files
    removeFile(dislike);

    let message = "";
    for (let i in dislike) {
        message += dislike[i] + '\n';
    }
    alert("dislike로 설정한 이미지가 삭제되었습니다. 삭제된 이미지는 아래와 같습니다.\n" + message);
}

form2.elements.remove2.onclick = function () {
    console.log("nRow: " + nRow);

    let dislike = [];
    for (let i = 0; i < nRow; i++) {
        if (!likeList[i] && !deletedList[i]) {
            console.log(`${cloudfrntUrl + fileList[i]} will be removed.`);

            dislike.push(fileList[i]);

            previewlist[i].innerHTML = '';

            deletedList[i] = true;
        }
    }

    // remove dislike files
    removeFile(dislike);

    let message = "";
    for (let i in dislike) {
        message += dislike[i] + '\n';
    }
    alert("dislike로 설정한 이미지가 삭제되었습니다. 삭제된 이미지는 아래와 같습니다.\n" + message);
}

function initiatePreview() {
    previewUrl = [];
    previewlist = [];

    for (let i = 0; i < nRow; i++) {
        likeList[i] = true;
        deletedList[i] = false;
        fileList[i] = "";

        previewlist.push(document.getElementById('preview' + i));
        // add listener        
        (function (index) {
            previewlist[index].addEventListener("click", function () {
                i = index;

                console.log('click! index: ' + index);

                likeList[i] = like;
                console.log('like: ' + likeList[i] + ' filename: ' + fileList[i]);

                // check validity
                const url = cloudfrntUrl+fileList[i];
                console.log('url: ', url);

                checkFile(url, i);                
            });
        })(i);
    }    
}

function likeOrDislike(x) {
    if (x.classList.value == "fa fa-thumbs-up fa-thumbs-down") {
        console.log('like!');
        like = true;
    }
    else {
        console.log('dislike!');
        like = false;
    }

    x.classList.toggle("fa-thumbs-down");
}

function sleep(ms) {
    const wakeUpTime = Date.now() + ms;
    while (Date.now() < wakeUpTime) { }
}

function checkFile(url, i) {
    const xhr = new XMLHttpRequest();

    xhr.open("GET", url, true);
    xhr.onreadystatechange = () => {
        console.log("xhr.statu: ", xhr.status);

        if(xhr.status === 403){
            console.log('No file, clear index of dynamodb');
            removeFile([fileList[i]])
            deletedList[i] = true;
            previewlist[i].innerHTML = '';
        }
    };

/*    let requestObj = {
        "emotion": JSON.stringify(emotionValue),
    };
    console.log("request: " + JSON.stringify(requestObj));

    let blob = new Blob([JSON.stringify(requestObj)], { type: 'application/json' });

    xhr.send(blob); */
    xhr.send();
}
