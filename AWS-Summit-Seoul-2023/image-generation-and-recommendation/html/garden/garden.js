const startButton = document.querySelector(".start-button");
const previewButton = document.querySelector(".preview-button");
// const downloadButton = document.querySelector(".download-button"); 
const emotionButton = document.querySelector(".emotion-button");
const nextButton = document.querySelector(".next-button");
//event
startButton.addEventListener("click", videoStart);
// previewButton.addEventListener("click",preview);
emotionButton.addEventListener("click", emotion);
nextButton.addEventListener("click", nextImages);

const previewPlayer = document.querySelector("#preview");
let canvas = document.getElementById('canvas');

canvas.width = previewPlayer.width;
canvas.height = previewPlayer.height;

let profileInfo_emotion, profileInfo_age, profileInfo_features;
profileInfo_emotion = document.getElementById('profile-emotion');
profileInfo_age = document.getElementById('profile-age');
// profileInfo_features = document.getElementById('profile-features');
promptText = document.getElementById('promptText');

const cloudfrntUrl = "https://d3ic6ryvcaoqdy.cloudfront.net/";

let previewUrl = [];
let previewlist = [];
let fileList = [];
const maxImgItems = 1;
let drawingIndex = 0;
// let uuid = uuidv4();
let userId;
let emotionValue;
let generation;
let gender;
let like = [];
for(let i=0;i<3;i++) like[i] = false;
let impression = [];

//functions
function videoStart() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
            previewPlayer.srcObject = stream;
        })
}

function preview() {
    canvas.getContext('2d').drawImage(previewPlayer, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(function (blob) {
        const img = new Image();
        img.src = URL.createObjectURL(blob);

        console.log(blob);

        // downloadButton.href=img.src;
        // console.log(downloadButton.href);
        // downloadButton.download =`capture_${new Date()}.jpeg`; 
    }, 'image/png');
}

function getEmotion() {
    const uri = cloudfrntUrl + "emotion";
    const xhr = new XMLHttpRequest();

    xhr.open("POST", uri, true);

    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            let response = JSON.parse(xhr.responseText);
            console.log("response: " + JSON.stringify(response));

            userId = response.id;
            console.log("userId: " + userId);

            gender = response.gender;
            console.log("gender: " + gender);

            generation = response.generation;
            console.log("generation: " + generation);

            let ageRangeLow = JSON.parse(response.ageRange.Low);
            let ageRangeHigh = JSON.parse(response.ageRange.High);
            let ageRange = `Age: ${ageRangeLow} ~ ${ageRangeHigh}`; // age   
            console.log('ages: ' + ageRange);

            let smile = response.smile;
            console.log("smile: " + smile);

            let eyeglasses = response.eyeglasses;
            console.log("eyeglasses: " + eyeglasses);

            let sunglasses = response.sunglasses;
            console.log("sunglasses: " + sunglasses);

            let beard = response.beard;
            console.log("beard: " + beard);

            let mustache = response.mustache;
            console.log("mustache: " + mustache);

            let eyesOpen = response.eyesOpen;
            console.log("eyesOpen: " + eyesOpen);

            let mouthOpen = response.mouthOpen;
            console.log("mouthOpen: " + mouthOpen);

            emotionValue = response.emotions.toLowerCase();
            console.log("emotion: " + emotionValue);

            let emotionText = "Emotion: ";
            if (emotionValue == "happy") emotionText += "행복 (HAPPY)";
            else if (emotionValue == "surprised") emotionText += "놀람 (SURPRISED)";
            else if (emotionValue == "calm") emotionText += "평온 (CALM)";
            else if (emotionValue == "angry") emotionText += "화남 (ANGRY)";
            else if (emotionValue == "fear") emotionText += "공포 (FEAR)";
            else if (emotionValue == "confused") emotionText += "혼란스러움 (CONFUSED)";
            else if (emotionValue == "disgusted") emotionText += "역겨움 (DISGUSTED)";
            else if (emotionValue == "sad") emotionText += "슬픔 (SAD)";

            let features = "Features:";
            if (smile) features += ' 웃음';
            if (eyeglasses) features += ' 안경';
            if (sunglasses) features += ' 썬글라스'; 
            if (beard) features += ' 수염';
            if (mustache) features += ' 콧수염';
            if (eyesOpen) features += ' 눈뜨고있음';
            if (mouthOpen) features += ' 입열고있음';
            console.log("features: " + features);

            let genderText;
            if (gender == 'Male') genderText = '남자'
            else genderText = '여자'
            let profileText = ageRange + ' (' + genderText + ')';
            console.log("profileText: " + profileText);

            profileInfo_emotion.innerHTML = `<h5>${emotionText}</h5>`
            profileInfo_age.innerHTML = `<h5>${profileText}</h5>`
            // profileInfo_features.innerHTML = `<h3>${features}</h3>`

            canvas.toBlob(function (blob) {
                const img = new Image();
                img.src = URL.createObjectURL(blob);

                console.log(blob);

                //    downloadButton.href = img.src;
                //    console.log(downloadButton.href);
                //    downloadButton.download = `capture_${emotionValue}_${gender}_${middleAge}_${new Date()}.jpeg`;
            }, 'image/png');

            // alert(xhr.responseText); // handle response.

            // getStableDiffusion(emotionValue);
            //let favorite = document.forms.input_row2.elements.favorite.value;
            //console.log("favorite: " + favorite);
            //favorite = favorite.toLowerCase();

            let favorite = document.getElementById("favoriteStr");
            console.log("favorite: " + favorite.value);

            if (favorite.value) emotionValue = emotionValue + '/' + favorite.value;
            console.log("emotion: ", emotionValue);

            // retrieve the images generated by the emotion
            drawGarden(emotionValue);
        }
        else {
            profileInfo_emotion.innerHTML = `<h3>No Face</h3>`
            profileInfo_age.innerHTML = ``
            // profileInfo_features.innerHTML = ""
        }
    };

    previewUrl = [];
    previewlist = [];

    // console.log('uuid: ', uuid);

    for (let i = 0; i < maxImgItems; i++) {
        previewlist.push(document.getElementById('preview' + i));

        // add listener        
        (function (index) {
            previewlist[index].addEventListener("click", function () {
                i = index;

                // console.log('click! index: ' + index);
                console.log('click!');
            })
        })(i);
    }

    for (let i = 0; i < maxImgItems; i++) {
        fileList[i] = "";
        previewlist[i].innerHTML = '';
    }

    canvas.toBlob(function (blob) {
        xhr.send(blob);
    });
}

function drawGarden(emotionValue) {
    const url = cloudfrntUrl + "gardenfromDB";
    const xhr = new XMLHttpRequest();

    xhr.open("POST", url, true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.log("--> responseText: " + xhr.responseText);
            let response = JSON.parse(xhr.responseText)

            let landscape = response['landscape'];
            console.log("landscape: " + JSON.stringify(landscape));
            let portrait = response['portrait'];
            console.log("portrait: " + JSON.stringify(portrait));

            for (let i in landscape) {
                previewUrl.push(landscape[i]);                
            }
            for (let i in portrait) {
                previewUrl.push(portrait[i]);                
            }

            // draw
            if (previewUrl.length) {
                updateImages(previewUrl, drawingIndex)
            }
            else {
                profileInfo_emotion.innerHTML = `<h3>No Image</h3>`;
                profileInfo_age.innerHTML = ``

                previewUrl = [];
                previewlist = [];

                alert("이미지가 조회되지 않습니다.");
            }
            //  imgPanel.scrollTop = imgPanel.scrollHeight;  // scroll needs to move bottom            
        }
    };

    let requestObj = {
        "id": userId,
        "emotion": emotionValue,
        "generation": generation,
        "gender": gender,
    };
    console.log("request: " + JSON.stringify(requestObj));

    let blob = new Blob([JSON.stringify(requestObj)], { type: 'application/json' });

    xhr.send(blob);
}

function sendLike(userId, itemId, impression) {
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
}

function emotion() {
    canvas.getContext('2d').drawImage(previewPlayer, 0, 0, canvas.width, canvas.height);
    drawingIndex = 0;

    getEmotion();
}

function nextImages() {
    console.log('previewUrl.length: ' + previewUrl.length);
    console.log('drawingIndex: ' + drawingIndex);

    if (previewUrl.length - drawingIndex <= 3) drawingIndex = 0;
    else drawingIndex += 3;

    updateImages(previewUrl, drawingIndex);

    for(let i=0;i<3;i++) like[i] = false;
}

function updateImages(previewUrl, i) {
    let htmlsrc;

    console.log('previewUrl.length - i: ', previewUrl.length - i);
    if (previewUrl.length - i >= 3) {
        htmlsrc = `<ab><img id="${i}" src="${previewUrl[i].url}" width="400"/><i onclick="likeOrDislike(0, this)" class="fa fa-thumbs-down"></i></ab>
        <ab><img id="${i+1}" src="${previewUrl[i+1].url}" width="400"/><i onclick="likeOrDislike(1, this)" class="fa fa-thumbs-down"></i></ab>
        <ab><img id="${i+2}" src="${previewUrl[i+2].url}" width="400"/><i onclick="likeOrDislike(2,this)" class="fa fa-thumbs-down"></i></ab>`;

        impression = [];
        let pos = previewUrl[i].url.lastIndexOf('emotions');
        fname = previewUrl[i].url.substring(pos)
        impression.push(fname);

        pos = previewUrl[i+1].url.lastIndexOf('emotions');
        fname = previewUrl[i+1].url.substring(pos)
        impression.push(fname);

        pos = previewUrl[i+2].url.lastIndexOf('emotions');
        fname = previewUrl[i+2].url.substring(pos)
        impression.push(fname);
    }
    else if (previewUrl.length - i >= 2) {
        htmlsrc = `<ab><img id="${i}" src="${previewUrl[i].url}" width="400"/><i onclick="likeOrDislike(0, this)" class="fa fa-thumbs-down"></i></ab>
        <ab><img id="${i+1}" src="${previewUrl[i+1].url}" width="400"/><i onclick="likeOrDislike(1, this)" class="fa fa-thumbs-down"></i></ab>`;        

        impression = [];
        let pos = previewUrl[i].url.lastIndexOf('emotions');
        fname = previewUrl[i].url.substring(pos)
        impression.push(fname);

        impression = [];
        pos = previewUrl[i+1].url.lastIndexOf('emotions');
        fname = previewUrl[i+1].url.substring(pos)
        impression.push(fname);
    }
    else {
        htmlsrc = `<ab><img id="${i}" src="${previewUrl[i].url}" width="400"/><i onclick="likeOrDislike(0, this)" class="fa fa-thumbs-down"></i></ab>`;

        let pos = previewUrl[i].url.lastIndexOf('emotions');
        fname = previewUrl[i].url.substring(pos)
        impression.push(fname);
    }
    // console.log('htmlsrc: ', htmlsrc);

    previewlist[0].innerHTML = htmlsrc;
}

function likeOrDislike(col, x) {
    console.log("column: ", col);

    if (x.classList.value == "fa fa-thumbs-down fa-thumbs-up") {
        console.log('dislike!');
        like[col] = false;
    }
    else {
        console.log('like['+col+']: '+ like[col]);

        if (!like[col]) {
            like[col] = true;

            console.log('drawingIndex: ' + drawingIndex+col);

            let pos = previewUrl[drawingIndex+col].url.lastIndexOf('emotions');
            fname = previewUrl[drawingIndex+col].url.substring(pos)
            console.log("fname: ", fname);

            sendLike(userId, fname, impression);
        }
        x.classList.value = "fa a-thumbs-up"
    }

    x.classList.toggle("fa-thumbs-up");
}

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}
