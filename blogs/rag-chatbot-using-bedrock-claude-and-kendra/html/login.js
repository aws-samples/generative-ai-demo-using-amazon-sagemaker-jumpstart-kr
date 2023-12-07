const myForm = document.querySelector('#my-form');
const userInput = document.querySelector('#userId');
const convtypeInput = document.querySelector('#convtype');

myForm.addEventListener('submit', onSubmit);

// load userId 
let userId = localStorage.getItem('userId'); // set userID if exists 
if(userId != '') {
    userInput.value = userId;
}

let conversationType = localStorage.getItem('convType'); // set conversationType if exists 
if(conversationType != '') {
    convtypeInput.value = conversationType;
}
else {
    convtypeInput.value = "normal"  // general conversation
}

console.log(userInput.value);
console.log(convtypeInput.value);

function onSubmit(e) {
    e.preventDefault();
    console.log(userInput.value);
    console.log(convtypeInput.value);

    localStorage.setItem('userId',userInput.value);
    console.log('Save Profile> userId:', userInput.value)    

    localStorage.setItem('convType',convtypeInput.value);
    console.log('Save Profile> convtype:', convtypeInput.value)

    window.location.href = "chat.html";
}

