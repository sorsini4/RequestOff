/*
function showEnd() {
    var checkBox = document.getElementById("multipleDays");
    var text = document.getElementById("end");
    if(checkBox.checked == true) {
        text.style.display = "block";
    }   
    else {
        text.style.display = "none";
    }   
}   
*/

function showHours() {
     var startDate = document.getElementById("startDate");
     var endDate   = document.getElementById("endDate");
     var hours     = document.getElementById("hours");
     if(startDate < endDate) {
         hours.style.display = "none";
     }
} 
