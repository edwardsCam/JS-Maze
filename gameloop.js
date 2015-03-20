var canvas_size = 500;

var wall_ratio = 5;
var wall_width;
var tile_size;

var start_time;

var high_scores = [];

var GAME = {};

GAME.initialize = function(n) {
  start_time = performance.now();

  function setVariables() {
    GAME.won = false;
    GAME._player = {
      x: 0,
      y: 0
    };
    GAME.tiles = [
      []
    ];
    GAME.walls_v = [
      []
    ];
    GAME.walls_h = [
      []
    ];
    GAME.crumbs = [
      []
    ];
    GAME.bestWithAdjacents = [
      []
    ];
    GAME.changed_flag = true;
    GAME.currTime = null;
    GAME._size = 0;
    GAME.optimalPath = [];
    GAME.badMoves = [];
    GAME.keyIsPressed = false;
    GAME.currentKey = 0;
    GAME.showingOptimal = false;
    GAME.showingHints = false;
    GAME.showingBreadcrumbs = true;
    GAME.showingScore = true;
    GAME._size = n;
    GAME.initialized = true;
    GAME.currScore = function() {
      var score = 0;
      for (var i = 0; i < GAME._size; i++) {
        for (var j = 0; j < GAME._size; j++) {
          if (GAME.crumbs[i][j] || (GAME._player.x == i && GAME._player.y == j)) {
            score += GAME.bestWithAdjacents[i][j];
          }

        }
      }
      return score;
    }
  }

  setVariables();
  wall_width = canvas_size / (n * wall_ratio + 1);
  tile_size = wall_width * wall_ratio;
  for (var i = 0; i < n; i++) {
    GAME.walls_v[i] = new Array(n - 1);
    GAME.walls_h[i] = new Array(n - 1);
    GAME.tiles[i] = new Array(n);
    GAME.crumbs[i] = new Array(n);
    GAME.bestWithAdjacents[i] = new Array(n);
    for (var j = 0; j < n; j++) {
      GAME.tiles[i][j] = (i == 0 && j == 0);
      GAME.crumbs[i][j] = false;
      GAME.bestWithAdjacents[i][j] = -2;
      if (i < n - 1)
        GAME.walls_v[i][j] = true;
      if (j < n - 1)
        GAME.walls_h[i][j] = true;
    }
  }

  function maze_html() {
    var new_html = '<div class="main-div">'

    new_html += '<div>Cameron Edwards HW2 MAZE</div>';
    new_html += '<div class="disp">';
    new_html += '<div class="disp"><canvas id = "canvas-main" width = "' + canvas_size + '" height = "' + canvas_size + '"></canvas></div>';
    new_html += '<div class="disp">';
    new_html += '<div id="scorediv"></div>';
    new_html += '<div id="timerdiv"></div>';

    new_html += '<div><br>';
    new_html += 'CONTROLS<br>';
    new_html += 'move: wasd / ijkl<br>';
    new_html += 'toggle best path: p<br>';
    new_html += 'toggle hints: h<br>';
    new_html += 'toggle breadcrumbs: b<br>';
    new_html += 'show score: y<br>';
    new_html += '</div>';

    new_html += '<div><br>';
    new_html += '<input type="submit" value="\nNew Game\n " onClick="GAME.restart();"/><br><br>';
    new_html += '<input type="submit" value="High Scores" onClick="GAME.show_scores();"/><br>';
    new_html += '<input type="submit" value="Credits" onClick="GAME.show_credits();"/>';
    new_html += '</div>';

    new_html += '</div>';
    new_html += '</div>';
    new_html += '</div>';
    return new_html;
  }

  document.getElementById('_main-div').innerHTML = maze_html();
  GAME.context = document.getElementById('canvas-main').getContext("2d");
  GAME.generateMaze();
  GAME.computeOptimalPath();
  GAME.currTime = performance.now();
  requestAnimationFrame(gameLoop);
}

GAME.show_scores = function() {
  if (high_scores.length == 0)
    alert("No finished games yet!");
  else {
    var output = "";
    for (var i = 0; i < high_scores.length; i++) {
      output += (i + 1) + ": Score: " + high_scores[i].score + ", Time: " + high_scores[i].time + "sec, Size: " + high_scores[i].size + "x" + high_scores[i].size;
      output += "\n";
    }
    alert(output);
  }
}

GAME.show_credits = function() {
  var output = "Created by Cameron Edwards\n";
  output += "CS5410, Homework 2";
  alert(output);
}

GAME.restart = function() {
  GAME.initialized = false;
  var new_html = 'Choose Size...';
  new_html += '<ul>';
  new_html += '<li><input type="submit" value="5x5" onClick="GAME.initialize(5);"/></li>';
  new_html += '<li><input type="submit" value="10x10" onClick="GAME.initialize(10);"/></li>';
  new_html += '<li><input type="submit" value="15x15" onClick="GAME.initialize(15);"/></li>';
  new_html += '<li><input type="submit" value="20x20" onClick="GAME.initialize(20);"/></li>';
  new_html += '<li><input type="submit" value="30x30" onClick="GAME.initialize(30);"/></li>';
  new_html += '<li><input type="submit" value="50x50" onClick="GAME.initialize(50);"/></li>';
  new_html += '</ul>';
  document.getElementById('_main-div').innerHTML = new_html;
}

function gameLoop() {
  if (GAME.initialized && !GAME.won) {
    var delta = performance.now() - GAME.currTime;
    GAME.currTime += delta;

    GAME.CollectInput(delta);
    GAME.Update(delta);
    GAME.Render(delta);
    requestAnimationFrame(gameLoop);
  }
}

GAME.CollectInput = function(delta) {
  document.onkeydown = checkKey;
  document.onkeyup = releaseKey;

  function checkKey(e) {
    if (!GAME.keyIsPressed) {
      GAME.keyIsPressed = true;
      GAME.currentKey = e.keyCode;
    }
  }

  function releaseKey() {
    GAME.keyIsPressed = false;
  }
}

GAME.Update = function(delta) {

  function isOnPath() {
    var onPath = false;
    for (var i = 0; i < GAME.optimalPath.length; i++) {
      if (GAME._player.x == GAME.optimalPath[i].x && GAME._player.y == GAME.optimalPath[i].y)
        onPath = true;
    }
    return onPath;
  }

  function popBadMove() {
    GAME.badMoves.splice(GAME.badMoves.length - 1, 1);
  }

  var k = GAME.currentKey;
  var bad = GAME.badMoves.length;
  if (k == 65 || k == 68 || k == 83 || k == 87 || (k >= 73 && k <= 76)) {
    if (k == 65 || k == 74) {
      if (GAME._player.x > 0 && !GAME.walls_v[GAME._player.x - 1][GAME._player.y]) {
        GAME.crumbs[GAME._player.x][GAME._player.y] = true;
        GAME._player.x--;
        if (!isOnPath() && GAME.badMoves[bad - 1] != 1)
          GAME.badMoves[bad] = 3;
        else
          popBadMove();
        GAME.changed_flag = true;
      }
    } else if (k == 87 || k == 73) {
      if (GAME._player.y > 0 && !GAME.walls_h[GAME._player.x][GAME._player.y - 1]) {
        GAME.crumbs[GAME._player.x][GAME._player.y] = true;
        GAME._player.y--;
        if (!isOnPath() && GAME.badMoves[bad - 1] != 2)
          GAME.badMoves[bad] = 0;
        else
          popBadMove();
        GAME.changed_flag = true;
      }
    } else if (k == 68 || k == 76) {
      if (GAME._player.x < GAME._size - 1 && !GAME.walls_v[GAME._player.x][GAME._player.y]) {
        GAME.crumbs[GAME._player.x][GAME._player.y] = true;
        GAME._player.x++;
        if (!isOnPath() && GAME.badMoves[bad - 1] != 3)
          GAME.badMoves[bad] = 1;
        else
          popBadMove();
        GAME.changed_flag = true;
      }
    } else {
      if (GAME._player.y < GAME._size - 1 && !GAME.walls_h[GAME._player.x][GAME._player.y]) {
        GAME.crumbs[GAME._player.x][GAME._player.y] = true;
        GAME._player.y++;
        if (!isOnPath() && GAME.badMoves[bad - 1] != 0)
          GAME.badMoves[bad] = 2;
        else
          popBadMove();
        GAME.changed_flag = true;
      }
    }
    if (GAME._player.x == GAME._size - 1 && GAME._player.y == GAME._size - 1) {
      GAME.won = true;
      high_scores[high_scores.length] = {
        score: GAME.currScore(),
        time: GAME.elapsed,
        size:GAME._size
      };
    }
  } else if (k == 80) {
    GAME.showingOptimal = !GAME.showingOptimal;
    GAME.showingHints = false;
    GAME.changed_flag = true;
  } else if (k == 72) {
    GAME.showingHints = !GAME.showingHints;
    GAME.showingOptimal = false;
    GAME.changed_flag = true;
  } else if (k == 66) {
    GAME.showingBreadcrumbs = !GAME.showingBreadcrumbs;
    GAME.changed_flag = true;
  } else if (k == 89) {
    GAME.showingScore = !GAME.showingScore;
    GAME.changed_flag = true;
  }

  if (GAME.changed_flag)
    GAME.currentKey = 0;
}

GAME.Render = function(delta) {
  if (GAME.changed_flag) {
    GAME.drawMaze();
    GAME.changed_flag = false;
  }
  if (GAME.won) {
    GAME.context.fillStyle = "rgb(255,0,0)";
    GAME.context.font="200px Impact";
    GAME.context.fillText("WIN",0,canvas_size/2);
    GAME.context.stroke();
  }

  GAME.elapsed = Math.floor((performance.now() - start_time) / 1000);
  document.getElementById("timerdiv").innerHTML = 'Time: ' + GAME.elapsed;
}

GAME.drawMaze = function() {
  GAME.context.clearRect ( 0 , 0 , canvas_size, canvas_size );
  GAME.drawPosts();
  GAME.drawWalls();
  if (GAME.showingBreadcrumbs)
    GAME.drawBreadcrumb();
  if (GAME.showingHints)
    GAME.drawHint();
  else if (GAME.showingOptimal)
    GAME.drawOptimal();
  GAME.drawPlayer();
  GAME.drawGoal();
  var new_html = '';
  if (GAME.showingScore)
    new_html += 'Score: ' + GAME.currScore();
  document.getElementById("scorediv").innerHTML = new_html;
}

GAME.drawPosts = function() {
  var n = GAME._size;
  GAME.context.fillStyle = "rgb(255,255,255)";
  GAME.context.fillRect(0, 0, canvas_size, canvas_size);
  GAME.context.fillStyle = "rgb(0,0,0)";
  GAME.context.fillRect(0, 0, canvas_size, wall_width);
  GAME.context.fillRect(0, 0, wall_width, canvas_size);
  GAME.context.fillRect(canvas_size - wall_width, 0, wall_width, canvas_size);
  GAME.context.fillRect(0, canvas_size - wall_width, canvas_size, wall_width);
  for (var i = 1; i < n; i++) {
    for (var j = 1; j < n; j++)
      GAME.context.fillRect(i * wall_width * wall_ratio, j * wall_width * wall_ratio, wall_width, wall_width);
  }
  GAME.context.stroke();
}

GAME.drawWalls = function() {
  var n = GAME._size;
  for (var i = 0; i < n; i++) {
    for (var j = 0; j < n; j++) {
      if (i < n - 1 && GAME.walls_v[i][j])
        GAME.context.fillRect(i * tile_size + tile_size, j * tile_size + wall_width, wall_width, tile_size - wall_width);
      if (j < n - 1 && GAME.walls_h[i][j])
        GAME.context.fillRect(i * tile_size + wall_width, j * tile_size + tile_size, tile_size - wall_width, wall_width);
    }
  }
  GAME.context.stroke();
}

GAME.drawBreadcrumb = function() {
  var n = GAME._size;
  GAME.context.fillStyle = "rgb(100,0,0)"
  for (var i = 0; i < n; i++) {
    for (var j = 0; j < n; j++) {
      if (GAME.crumbs[i][j])
        GAME.context.fillRect(i * tile_size + wall_width * 2.5, j * tile_size + wall_width * 2.5, wall_width, wall_width);
    }
  }
  GAME.context.stroke();
}

GAME.drawHint = function() {
  GAME.context.fillStyle = "rgb(255,0,255)";
  var pos = {
    x: GAME._player.x,
    y: GAME._player.y
  };
  if (GAME.badMoves.length > 0) {
    switch (GAME.badMoves[GAME.badMoves.length - 1]) {
      case 0:
        pos.y++;
        break;
      case 1:
        pos.x--;
        break;
      case 2:
        pos.y--;
        break;
      case 3:
        pos.x++;
        break;
    }
  } else {
    for (var i = 0; i < GAME.optimalPath.length; i++) {
      if (GAME.optimalPath[i].x == pos.x && GAME.optimalPath[i].y == pos.y && i < GAME.optimalPath.length - 1) {
        pos.x = GAME.optimalPath[i + 1].x;
        pos.y = GAME.optimalPath[i + 1].y;
        break;
      }
    }
  }
  GAME.context.fillRect(pos.x * tile_size + wall_width * 2.5, pos.y * tile_size + wall_width * 2.5, wall_width, wall_width);
}

GAME.drawOptimal = function() {
  GAME.context.fillStyle = "rgb(255,0,255)";
  var curr = {
    x: GAME._player.x,
    y: GAME._player.y
  };

  var temp = GAME.badMoves.slice();
  while (temp.length > 0) {
    GAME.context.fillRect(curr.x * tile_size + wall_width * 2.5, curr.y * tile_size + wall_width * 2.5, wall_width, wall_width);
    switch (temp[temp.length - 1]) {
      case 0:
        curr.y++;
        break;
      case 1:
        curr.x--;
        break;
      case 2:
        curr.y--;
        break;
      case 3:
        curr.x++;
        break;
    }
    temp.splice(temp.length - 1, 1);
  }

  var found = false;
  for (var i = 0; i < GAME.optimalPath.length; i++) {
    var cx = GAME.optimalPath[i].x;
    var cy = GAME.optimalPath[i].y;
    if (!found) {
      if (cx == curr.x && cy == curr.y)
        found = true;
    }
    if (found)
      GAME.context.fillRect(cx * tile_size + wall_width * 2.5, cy * tile_size + wall_width * 2.5, wall_width, wall_width);
  }
  GAME.context.stroke();
}

GAME.drawPlayer = function() {
  GAME.context.fillStyle = "rgb(255,0,0)";
  GAME.context.fillRect(GAME._player.x * tile_size + wall_width * 2, GAME._player.y * tile_size + wall_width * 2, wall_width * 2, wall_width * 2);
  GAME.context.stroke();
}

GAME.drawGoal = function() {
  GAME.context.fillStyle = "rgb(0,255,0)";
  GAME.context.fillRect((GAME._size - 1) * tile_size + wall_width * 2, (GAME._size - 1) * tile_size + wall_width * 2, wall_width * 2, wall_width * 2);
  GAME.context.stroke();
}

GAME.generateMaze = function() {

  var wall_list = [{
    x: 0,
    y: 0,
    horiz: false
  }, {
    x: 0,
    y: 0,
    horiz: true
  }];

  while (wall_list.length > 0) {
    {
      var n = GAME._size;
      var r = Math.floor(Math.random() * wall_list.length);
      var wall = wall_list[r]; //random wall
      var wallx = wall.x;
      var wally = wall.y;

      if (wall.horiz) {
        if (!GAME.tiles[wallx][wally + 1]) {
          GAME.tiles[wallx][wally + 1] = true;
          GAME.walls_h[wallx][wally] = false;
          wally++;
        }
      } else if (!GAME.tiles[wallx + 1][wally]) {
        GAME.tiles[wallx + 1][wally] = true;
        GAME.walls_v[wallx][wally] = false;
        wallx++;
      }
      wall_list.splice(r, 1);

      for (var i = 0; i < 4; i++) {
        switch (i) {
          case 0:
            if (wally > 0 && GAME.walls_h[wallx][wally - 1] && !GAME.tiles[wallx][wally - 1])
              wall_list[wall_list.length] = {
                x: wallx,
                y: wally - 1,
                horiz: true
              };
            break;

          case 1:
            if (wallx < n - 1 && GAME.walls_v[wallx][wally] && !GAME.tiles[wallx + 1][wally])
              wall_list[wall_list.length] = {
                x: wallx,
                y: wally,
                horiz: false
              };
            break;

          case 2:
            if (wally < n - 1 && GAME.walls_h[wallx][wally] && !GAME.tiles[wallx][wally + 1])
              wall_list[wall_list.length] = {
                x: wallx,
                y: wally,
                horiz: true
              };
            break;

          case 3:
            if (wallx > 0 && GAME.walls_v[wallx - 1][wally] && !GAME.tiles[wallx - 1][wally])
              wall_list[wall_list.length] = {
                x: wallx - 1,
                y: wally,
                horiz: false
              };
            break;
        };
      }
    }
  }
}

GAME.computeOptimalPath = function() {
  var n = GAME._size;
  var curr = {
    x: 0,
    y: 0,
    dir: 2
  };
  var marked = [
    []
  ];

  for (var i = 0; i < n; i++)
    marked[i] = new Array(n);

  var count = 0;

  while (!(curr.x == n - 1 && curr.y == n - 1)) {
    switch (curr.dir) {
      case 0:
        if (curr.x < n - 1 && !GAME.walls_v[curr.x][curr.y]) {
          marked[curr.x++][curr.y] = '>';
          curr.dir = 1;
        } else if (curr.y > 0 && !GAME.walls_h[curr.x][curr.y - 1] && (curr.x < n - 1 ? GAME.walls_v[curr.x][curr.y] : true))
          marked[curr.x][curr.y--] = '^';
        else
          curr.dir = 3;
        break;

      case 1:
        if (curr.y < n - 1 && !GAME.walls_h[curr.x][curr.y]) {
          marked[curr.x][curr.y++] = 'v';
          curr.dir = 2;
        } else if (curr.x < n - 1 && !GAME.walls_v[curr.x][curr.y] && (curr.y < n - 1 ? GAME.walls_h[curr.x][curr.y] : true))
          marked[curr.x++][curr.y] = '>';
        else
          curr.dir = 0;
        break;

      case 2:
        if (curr.x > 0 && !GAME.walls_v[curr.x - 1][curr.y]) {
          marked[curr.x--][curr.y] = '<';
          curr.dir = 3;
        } else if (curr.y < n - 1 && !GAME.walls_h[curr.x][curr.y] && (curr.x > 0 ? GAME.walls_v[curr.x - 1][curr.y] : true))
          marked[curr.x][curr.y++] = 'v';
        else
          curr.dir = 1;
        break;

      case 3:
        if (curr.y > 0 && !GAME.walls_h[curr.x][curr.y - 1]) {
          marked[curr.x][curr.y--] = '^';
          curr.dir = 0;
        } else if (curr.x > 0 && !GAME.walls_v[curr.x - 1][curr.y] && (curr.y > 0 ? GAME.walls_h[curr.x][curr.y - 1] : true))
          marked[curr.x--][curr.y] = '<';
        else
          curr.dir = 2;
        break;
    }
  }

  curr.x = 0;
  curr.y = 0;
  var count = 1;
  while (!(curr.x == n - 1 && curr.y == n - 1)) {
    GAME.optimalPath[GAME.optimalPath.length] = {
      x: curr.x,
      y: curr.y
    };
    GAME.bestWithAdjacents[curr.x][curr.y] = 5;
    for (var k = 0; k < 4; k++) {
      switch (k) {
        case 0:
          if (curr.y > 0 && !GAME.walls_h[curr.x][curr.y - 1] && GAME.bestWithAdjacents[curr.x][curr.y - 1] != 5)
            GAME.bestWithAdjacents[curr.x][curr.y - 1] = -1;
          break;
        case 1:
          if (curr.x < GAME._size - 1 && !GAME.walls_v[curr.x][curr.y] && GAME.bestWithAdjacents[curr.x + 1][curr.y] != 5)
            GAME.bestWithAdjacents[curr.x + 1][curr.y] = -1;
          break;
        case 2:
          if (curr.y < GAME._size - 1 && !GAME.walls_h[curr.x][curr.y] && GAME.bestWithAdjacents[curr.x][curr.y + 1] != 5)
            GAME.bestWithAdjacents[curr.x][curr.y + 1] = -1;
          break;
        case 3:
          if (curr.x > 0 && !GAME.walls_v[curr.x - 1][curr.y] && GAME.bestWithAdjacents[curr.x - 1][curr.y] != 5)
            GAME.bestWithAdjacents[curr.x - 1][curr.y] = -1;
          break;
      }
    }
    GAME.bestWithAdjacents[0][0] = 0;
    GAME.bestWithAdjacents[GAME._size - 1][GAME._size - 1] = 0;

    switch (marked[curr.x][curr.y]) {
      case '^':
        curr.y--;
        break;
      case '>':
        curr.x++;
        break;
      case 'v':
        curr.y++;
        break;
      case '<':
        curr.x--;
        break;
    }
  }
}