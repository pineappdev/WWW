function pseudonimPopup()
{
    let popup = document.getElementById("pseudonimPopup");
    popup.style.display = "block";

    enableModal();
}

function closePopup()
{
    let popup = document.getElementById("pseudonimPopup");
    popup.style.display = "none";
    
    disableModal();
}

function openMainScreenIfGotNickname()
{
    window.location.href = "file:///home/jacek/Subjects/WWW/project/mainScreen";
}

function enableModal()
{
    let modal = document.getElementById("modal");
    modal.style.display = "block";
}

function disableModal()
{
    let modal = document.getElementById("modal");
    modal.style.display = "none";
}

function openHighScoresJson(url: string)
{
    let xmlhttp = new XMLHttpRequest();

    var myArr = JSON.parse('{\
        "Benjamin Button": 348,\
        "Noobmaster69": 300,\
        "Legend27": 299,\
        "Gandalf": 278,\
        "Tony Stark": 256,\
        "Viper": 245,\
        "Geralt": 234,\
        "James Hetfield": 187,\
        "Han Solo": 159,\
        "Thor": 89\
    }')

    displayHighScores(myArr);
}

function displayHighScores(arr: Object)
{
    let winners_list = document.getElementById("highScoresList");
    winners_list.innerHTML = "<li id='li1'>HIGH SCORES</li>";

    let winners_sorted = [];
    
    for (let name in arr)
    {
        winners_sorted.push([name, arr[name]]);
    }

    winners_sorted.sort(function(a, b) {
        return b[1] - a[1];
    });

    for(let idx in winners_sorted)
    {
        winners_list.innerHTML +=
            '<li>' + winners_sorted[idx][0] + ' ' + winners_sorted[idx][1] + '</li>';
    }
}

function getCookie(cname: string)
{
    var name = cname + "=";

    var decodedCookie = decodeURIComponent(document.cookie);

    var ca = decodedCookie.split(';');

    for(var i = 0; i < ca.length; i++)
    {
        var c = ca[i];
        while (c.charAt(0) == ' ')
        {
            c = c.substring(1);
        }
        
        if (c.indexOf(name) == 0)
        {
            return c.substring(name.length, c.length);
        }
    }

    return "";
}

function readAndDisplayHighScores()
{
    let cookie = getCookie("high_scores");
    if(cookie == "" || cookie == undefined)
    {
        openHighScoresJson("../initial/high_scores.json");
    }
    else
    {
        displayHighScores(JSON.parse(cookie));
    }
}

readAndDisplayHighScores();
