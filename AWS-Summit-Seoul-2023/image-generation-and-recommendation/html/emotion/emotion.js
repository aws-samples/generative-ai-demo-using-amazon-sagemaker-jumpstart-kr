//DOM
const startButton =document.querySelector(".start-button");
const previewButton =document.querySelector(".preview-button");
const downloadButton =document.querySelector(".download-button");
const emotionButton =document.querySelector(".emotion-button");
const previewPlayer = document.querySelector("#preview");

//event
startButton.addEventListener("click",videoStart);
// previewButton.addEventListener("click",preview);
emotionButton.addEventListener("click",emotion);

let canvas = document.getElementById('canvas');     
canvas.width = previewPlayer.width;
canvas.height = previewPlayer.height;
let emotionValue;
let uuid = uuidv4();

let profileInfo_emotion, profileInfo_age, profileInfo_features;

profileInfo_emotion = document.getElementById('profile-emotion');
profileInfo_age = document.getElementById('profile-age');
profileInfo_features = document.getElementById('profile-features');
    
//functions
function videoStart() {
    navigator.mediaDevices.getUserMedia({ video:true,audio:false })
    .then(stream => {
        previewPlayer.srcObject = stream;
    })
}

function preview() {
    canvas.getContext('2d').drawImage(previewPlayer, 0, 0, canvas.width, canvas.height);  

    canvas.toBlob(function(blob){
          const img = new Image();
          img.src = URL.createObjectURL(blob);
  
          console.log(blob);
          
          // downloadButton.href=img.src;
          // console.log(downloadButton.href);
          // downloadButton.download =`capture_${new Date()}.jpeg`;
    },'image/png');    
}

function getEmotion() {
    canvas.getContext('2d').drawImage(previewPlayer, 0, 0, canvas.width, canvas.height);  

    const uri = "https://d3ic6ryvcaoqdy.cloudfront.net/emotion";
    const xhr = new XMLHttpRequest();

    xhr.open("POST", uri, true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            let response = JSON.parse(xhr.responseText);
            console.log("response: " + JSON.stringify(response));

            console.log('uuid: ', uuid);
            
            let gender = response.gender;
            console.log("gender: " + gender);   

            let ageRangeLow = JSON.parse(response.ageRange.Low);
            let ageRangeHigh = JSON.parse(response.ageRange.High);
            let middleAge = (ageRangeLow+ageRangeHigh)/2;
            let ageRange = `Age: ${ageRangeLow} ~ ${ageRangeHigh}`; // age   
            console.log('ages: '+ ageRange); 

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

            emotionValue = response.emotions;
            console.log("emotion: " + emotionValue);          
            let emotionText = "Emotion: ";
            if(emotionValue == "HAPPY") emotionText += "행복 (HAPPY)";
            else if(emotionValue == "SURPRISED") emotionText += "놀람 (SURPRISED)";
            else if(emotionValue == "CALM") emotionText += "평온 (CALM)";
            else if(emotionValue == "ANGRY") emotionText += "화남 (ANGRY)";
            else if(emotionValue == "FEAR") emotionText += "공포 (FEAR)";
            else if(emotionValue == "CONFUSED") emotionText += "혼란스러움 (CONFUSED)";
            else if(emotionValue == "DISGUSTED") emotionText += "역겨움 (DISGUSTED)";
            else if(emotionValue == "SAD") emotionText += "슬픔 (SAD)";
            
            let features = "Features:";
            if(smile) features += ' 웃음';
            if(eyeglasses) features += ' 안경';
            if(sunglasses) features += ' 썬글라스';
            if(beard) features += ' 수염';
            if(mustache) features += ' 콧수염';
            if(eyesOpen) features += ' 눈뜨고있음';
            if(mouthOpen) features += ' 입열고있음';
            console.log("features: " + features);   

            let genderText;
            if(gender=='Male') genderText='남자'
            else genderText='여자'            
            let profileText = ageRange+' ('+genderText+')';
            console.log("profileText: " + profileText);   

            profileInfo_emotion.innerHTML = `<h3>${emotionText}</h3>`
            profileInfo_age.innerHTML = `<h3>${profileText}</h3>`
            profileInfo_features.innerHTML = `<h3>${features}</h3>`

            canvas.toBlob(function(blob){
                const img = new Image();
                img.src = URL.createObjectURL(blob); 
        
                console.log(blob);
                
                downloadButton.href=img.src;
                console.log(downloadButton.href);
                downloadButton.download =`capture_${emotionValue}_${gender}_${middleAge}_${new Date()}.jpeg`;
            },'image/png');   

            // alert(xhr.responseText); // handle response.
        }
        else {
            profileInfo_emotion.innerHTML = `<h3>No Face</h3>`
            profileInfo_age.innerHTML = ``
            profileInfo_features.innerHTML = ``
        }
    };    

    canvas.toBlob(function(blob){
        xhr.send(blob);
    });
}

function emotion() {
    getEmotion();
}

function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}
