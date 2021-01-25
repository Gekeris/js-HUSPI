window.onload = function () {
    var socket = io.connect('http://localhost:3000');

    socket.on('userListUpdate', function (userList) {
      document.getElementById("content_ul").innerHTML = function () {
        res = "";
        console.log(userList);
        userList.forEach(function(user) {
          res += `<form action="/profile/${user._id}" method="get">`
  				if (user.active) {
  					res += `<li>`;
  				  res += `<span>${user.name} ${user.surname} (${user.email})</span>`;
  				  res += `<button type="submit">Open Profile</button>`;
  				}
          else {
  					res += `<li class="off">`;
  					res += `<span>${user.name} ${user.surname} (${user.email})</span>`;
            res += `<button class="off" type="submit">Open Profile</button>`;
          };
          res += `</li>`;
  				res += `</form>`;
  			})
        return res;
      }();
    });
}
