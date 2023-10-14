const myForm = document.querySelector('#my-form');
const userInput = document.querySelector('#userId');

myForm.addEventListener('submit', onSubmit);

// load userId 
let userId = localStorage.getItem('userId'); // set userID if exists 
if(userId != '') {
    userInput.value = userId;
}

console.log(userInput.value);

function onSubmit(e) {
    e.preventDefault();
    console.log(userInput.value);

    localStorage.setItem('userId',userInput.value);
    console.log('Save Profile> userId:', userInput.value)    

    window.location.href = "chat.html";
}

