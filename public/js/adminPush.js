window.onload = function () {
    var socket = io.connect('http://localhost:3000');

    socket.on('newUserAlert', function (user) {
      alert(`New user: ${user.name} ${user.surname} (${user.email})`)
    })
}
