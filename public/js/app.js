/**
 * Client side
 */

// Your web app's Firebase configuration
var firebaseConfig = {
    apiKey: "AIzaSyDljMlS_tnJYJ-YPtPXATfeMhkFHUAnW1c",
    authDomain: "shared-canvas-b4743.firebaseapp.com",
    databaseURL: "https://shared-canvas-b4743.firebaseio.com",
    projectId: "shared-canvas-b4743",
    storageBucket: "shared-canvas-b4743.appspot.com",
    messagingSenderId: "251540930106",
    appId: "1:251540930106:web:5584debb528949d888ff03",
    measurementId: "G-8ZDDF6CX68"
};

// connects to the server
const socket = io();
let drawing = [];

// When the browser is ready
document.addEventListener("DOMContentLoaded", () => {

    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    const div = document.querySelector('#buttons');
    const btnSave = document.querySelector('#btnSave');
    const btnLoad = document.querySelector('#btnLoad');
    const btnClear = document.querySelector('#btnClear');
    const message = document.querySelector('#messsage');

    var mouse = {
        click: false,
        move: false,
        pos: { x: 0, y: 0 },
        pos_prev: false
    };
    var user;

    // don't display the screen elements until signin
    div.style.display = 'none';
    canvas.style.display = 'none';

    // ------------------------- firebase section -----------------------
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    firebase.analytics();

    var database = firebase.database();

    // Initialize the FirebaseUI Widget using Firebase.
    var ui = new firebaseui.auth.AuthUI(firebase.auth());

    var uiConfig = {
        callbacks: {
            signInSuccessWithAuthResult: function (authResult, redirectUrl) {
                // User successfully signed in.
                // Return type determines whether we continue the redirect automatically
                // or whether we leave that to developer to handle.
                user = firebase.auth().currentUser;
                canvas.style.display = 'initial';
                div.style.display = 'initial';
                // hide from anonymous user save and load buttons
                if (user.isAnonymous) {
                    btnSave.style.display = 'none';
                    btnLoad.style.display = 'none';
                }
                
                return false;
            },
            uiShown: function () {
                // The widget is rendered.
                // Hide the loader.
                document.getElementById('loader').style.display = 'none';
            }
        },
        // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
        signInFlow: 'popup',
        signInSuccessUrl: '',
        signInOptions: [
            // Leave the lines as is for the providers you want to offer your users.
            firebase.auth.EmailAuthProvider.PROVIDER_ID,
            firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID
        ]
    };

    ui.start('#firebaseui-auth-container', uiConfig);

    // ------------------------- end of firebase section -----------------------

    // saves the drawing to firebase
    btnSave.addEventListener('click', () => {
        if (!user.isAnonymous) {
            var ref = database.ref('drawings/' + user.uid);
            var doc = {
                drawing: drawing
            }

            ref.set(doc).then( () => {
                message.innerHTML = 'Drawing saved successfully!';
                message.style.color = 'green';
            }).catch(error => {
                message.innerHTML = (error + ' - drawing not saved');
                message.style.color = 'red';
            });
        }
    })

    // Load drawing from the database
    btnLoad.addEventListener('click', () => {
        var ref = database.ref('drawings/' + user.uid);

        ref.once('value').then(snapshot => {
            // checks if the current user has a saved drawing
            if (snapshot.val()) {
                // Load the drawing from firebase
                drawing = snapshot.val().drawing;

                // clears history
                context.clearRect(0, 0, canvas.width, canvas.height);
                socket.emit('update', { drawing: drawing });
                // prints the drawing
                for (var i in drawing) {
                    socket.emit('drawing', {
                        points: drawing[i],
                        drawing: drawing
                    });
                }
            } else {
                message.innerHTML = 'Drawing does not exist for this user';
                message.style.color = 'red';
            }
        }).catch(error => {
            message.innerHTML = error;
            message.style.color = 'red';
        })

    })

    // Clear drawing board
    btnClear.addEventListener('click', () => {
        drawing = [];
        // clears history
        context.clearRect(0, 0, canvas.width, canvas.height);
        socket.emit('update', { drawing: drawing });
        message.innerHTML = '';
    });

    socket.on('clear', () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        message.innerHTML = '';
    });

    // the user is drawing
    canvas.onmousedown = e => {
        e.preventDefault();
        mouse.click = true;
        message.innerHTML = '';
    }

    // the user isn't drawing
    canvas.onmouseup = e => {
        mouse.click = false;
    };

    canvas.onmousemove = e => {
        // update the mouse coordinates (-10 because of the canvas border)
        mouse.pos.x = e.pageX - 10;
        mouse.pos.y = e.pageY - 10;
        mouse.move = true;
    };

    // handles the drawing event
    socket.on('drawing', data => {

        let points = data.points;

        if (points) {
            context.lineWidth = 5;
            context.beginPath();
            context.moveTo(points[0].x, points[0].y);
            context.lineTo(points[1].x, points[1].y);
            context.stroke();
            context.closePath();

            drawing = data.drawing;
        }
    })

    socket.on('left', id => {
        console.log('user left: ' + id);
    });

    // main loop, running every 25ms
    function mainLoop() {
        // check if the user is drawing
        if (mouse.click && mouse.move && mouse.pos_prev) {
            // sends line to to the server
            socket.emit('drawing', {
                points: [mouse.pos, mouse.pos_prev]
            });
            mouse.move = false;
        }
        mouse.pos_prev = { x: mouse.pos.x, y: mouse.pos.y };
        setTimeout(mainLoop, 25);
    }

    mainLoop();
});