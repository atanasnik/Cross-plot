const controlPointRadius = 7;
const INVALID_IDX = -1;

var addingControlPoints = false;
var removingControlPoints = false;
var showingSecondAndFourthQuadrant = false;

var currentControlPoints = [];
var currentXPoints = [];
var currentYPoints = [];

var ctx = null;
var canvas = null;

var movingControlPointIdx = INVALID_IDX;

//Initializing
function start() {
	canvas = document.getElementById("canvas");

	if (!canvas) {
		alert("Cannot provide canvas!");
		return;
	}

	ctx = canvas.getContext("2d");

	if (!ctx) {
		alert("Cannot load context!");
		return;
	}

	//Enable anti-aliasing for shapes and text
	ctx.imageSmoothingEnabled = true;

	//Here we declare the events we are going to operate with
	canvas.addEventListener("click", handleMouseClick);
	canvas.addEventListener("mousedown", handleMouseDown);
	canvas.addEventListener("mousemove", handleMouseMove);
	canvas.addEventListener("mouseup", handleMouseUp);

	fillCanvas();
	drawCartesianCoordinateSystem();
}

//Adding/removing control points
function handleMouseClick(event) {
	if (!addingControlPoints && !removingControlPoints) {
		return;
	}

	var point = mousePoint(event);

	if (!isPointInFirstQuadrant(point)) {
		return;
	}

	if (addingControlPoints) {
		//If adding control points mode is active
		currentControlPoints.push(point);
		redrawCanvas();
	} else if (removingControlPoints) {
		//If control point removal mode is active
		//we check every existing control point:
		//If the mouse click point is within the circle that
		//represents the point (which means its distance
		//to the center of each circle is less than the radius)
		for (var i = 0; i < currentControlPoints.length; ++i) {
			if (isPointSelected(point, currentControlPoints[i], controlPointRadius)) {
				currentControlPoints.splice(i, 1);
				redrawCanvas();
				break;
			}
		}
	}
}

//Picking & moving a point with the mouse
function handleMouseDown(event) {
	if (addingControlPoints || removingControlPoints) {
		return;
	}

	var point = mousePoint(event);
	movingControlPointIdx = INVALID_IDX;

	if (!isPointInFirstQuadrant(point)) {
		return;
	}

	//Just like in the previous function, we are checking if the
	//selected point exists among the control points with the Euclidean distance formula
	for (var i = 0; i < currentControlPoints.length; ++i) {
		if (isPointSelected(point, currentControlPoints[i], controlPointRadius)) {
			movingControlPointIdx = i;
			break;
		}
	}
}

//Moving a point with the mouse
function handleMouseMove(event) {
	if (movingControlPointIdx == INVALID_IDX) {
		return;
	}

	var point = mousePoint(event);

	if (!isPointInFirstQuadrant(point)) {
		return;
	}

	currentControlPoints[movingControlPointIdx] = point;
	redrawCanvas();
}

//Releasing a point after moving
function handleMouseUp(event) {
	movingControlPointIdx = INVALID_IDX;
}

//Clicking on the canvas (creates a point)
function mousePoint(event) {
	var canvasRect = canvas.getBoundingClientRect();
	var x = event.clientX - canvasRect.left;
	var y = event.clientY - canvasRect.top;

	return new point(x, y);
}

//Draws a point. Each point is represented as a circle
function drawControlPoint(point, pointStroke) {
	drawCircle(point, controlPointRadius, pointStroke);
}

//Draws all given points
function drawControlPoints(controlPoints, pointStroke) {
	for (var i = 0; i < controlPoints.length; ++i) {
		drawControlPoint(controlPoints[i], pointStroke);
	}
}

//Recalculates current points and redraws everything
function redrawCanvas() {
	const resetPoints = false;
	clearCanvas(resetPoints);

	if (currentControlPoints.length > 0) {
		drawCurve(currentControlPoints, "purple", "black");
		
		if (showingSecondAndFourthQuadrant) {
			calculateFourthQuadrantPoints();
			drawCurve(currentXPoints, "purple", "grey");
			
			calculateSecondQuadrantPoints();
			drawCurve(currentYPoints, "purple", "grey");
		}
	}

}

//Clears the canvas of all currently drawn objects
function clearCanvas(resetPoints=true) {
	if (removingControlPoints && resetPoints) {
		toggleControlPointsRemovalMode();
	}

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	if (resetPoints) {
		clearControlPoints();
	}

	//Clears the points of x(t) and y(t)
	clearFourthQuadrantPoints();
	clearSecondQuadrantPoints();

	//Redrawing the canvas and the coordinate system
	fillCanvas();
	drawCartesianCoordinateSystem();
}

//Changes the control points adding state when the User presses the corresponding button
function toggleControlPointsAddingState() {
	if (removingControlPoints) {
		toggleControlPointsRemovalMode();
	}

	setControlPointsAddingStatesActive(!addingControlPoints);
}

//Changes the 'Add control points' button when the User presses it
function setControlPointsAddingStatesActive(active) {
	addingControlPoints = active;

    var button = document.getElementById("adding");

    if (addingControlPoints) {
        button.innerHTML = "Stop adding control points";
	} else {
        button.innerHTML = "Add control points";
	}
}

//Changes the control points removal mode when the User presses the corresponding button
function toggleControlPointsRemovalMode() {
	if (addingControlPoints) {
		toggleControlPointsAddingState();
	}

	if (currentControlPoints.length == 0) {
		return;
	}
	
	setControlPointsRemovalModeActive(!removingControlPoints);
}

//Changes the 'Remove control points' button when the User presses it
function setControlPointsRemovalModeActive(active) {
	removingControlPoints = active;

	var button = document.getElementById("removing");

	if (removingControlPoints) {
        button.innerHTML = "Stop removing control points";
	} else {
        button.innerHTML = "Remove control points";
	}
}

//Changes the visibility mode of x(t) and y(t) when the user presses the corresponding button
function toggleSecondAndFourthQuadrantVisibilityMode() {
	setSecondAndFourthQuadrantVisibility(!showingSecondAndFourthQuadrant);
}

//Changes 'Show cross plot button' when the user presses it & applies changes to canvas
function setSecondAndFourthQuadrantVisibility(active) {
	showingSecondAndFourthQuadrant = active;

	var button = document.getElementById("show_xt_and_yt");

	if (showingSecondAndFourthQuadrant) {
        button.innerHTML = "Hide cross plot";
	} else {
        button.innerHTML = "Show cross plot";
	}

	//We need to recalculate the points for x(t) and y(t) in order to 
	//show/hide the crossplot graphics, so we redraw the whole canvas
	redrawCanvas();
}

//Checks if the selected point is within the range of any of the control points,
//which are represented as circles

//Distance between the center of the circle and the picked point is calculated
//through the use of the Euclidean distance formula
function isPointSelected(pickedPoint, existingPoint, radius) {
    var dx = pickedPoint.x - existingPoint.x;
    var dy = pickedPoint.y - existingPoint.y;

	return (dx * dx + dy * dy <= radius * radius);
}

//Draws a single line, necessary for the axes of the coordinate system
function drawLine(from, to, color="blue") {
	ctx.beginPath();
	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	ctx.moveTo(from.x, from.y);
	ctx.lineTo(to.x, to.y);
	ctx.stroke();
}

//Draws a single point as a circle
function drawCircle(center, radius, pointStroke) {
	ctx.beginPath();
	ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI, false);
	ctx.lineWidth = 2;
	ctx.fillStyle = "black";
	ctx.fill();
	ctx.strokeStyle = pointStroke;
	ctx.stroke();
}

//Wraps up the logic of the drawing of the curve through De Casteljau's algorithm
function drawCurve(points, pointStroke, curveColor) {
	if (points.length == 0) {
		return;
	}

	drawCurveWithParams(0, 1, points, pointStroke, curveColor);

	connectControlPoints(points);
}

//Draws the curve with a parameter t spanning from 0 to 1, each time incrementing t by 0.001
function drawCurveWithParams(from, to, points, pointStroke, color="black") {
	drawControlPoints(points, pointStroke);
	ctx.strokeStyle = color;

	for (var t = from; t <= to; t += 0.001) {

		//Calculates the coordinates of the current point of the curve through De Casteljau's algorithm,
		var point = getPointWithDeCasteljau(t, points);
		// then draws the latter point on the canvas (as a rectangle of widh and height 1)
		ctx.strokeRect(point.x, point.y, 1, 1);
	}
}

//Deletes all current control points
function clearControlPoints() {
	currentControlPoints = [];
}

//Deletes all current y(t) points
function clearSecondQuadrantPoints() {
	currentYPoints = [];
}

//Deletes all current x(t) points
function clearFourthQuadrantPoints() {
	currentXPoints = [];
}

//Connects each of the current control points with a line
function connectControlPoints(controlPoints) {
	var points = controlPoints;
	if (points.length == 0) {
		alert("Control points missing");
		return;
	}

	ctx.beginPath();
	ctx.strokeStyle = "purple";
	ctx.lineWidth = 1;

	for (var i = 0; i < points.length - 1; ++i) {
		ctx.moveTo(points[i].x, points[i].y);
		ctx.lineTo(points[i + 1].x, points[i + 1].y);
		ctx.stroke();
	}
}

//An iterative implementation of De Casteljau's algorithm
function getPointWithDeCasteljau(t, controlPoints) {
	if (controlPoints.length == 1) {
		return controlPoints[0];
	}

	//Creating a shallow copy because deep copying is a slow operation
	var points = controlPoints.slice();

	while (points.length != 1) {
		var nextControlPoints = [];

		for (var i = 1; i < points.length; ++i) {
			var x = (1 - t) * points[i - 1].x + t * points[i].x;
			var y = (1 - t) * points[i - 1].y + t * points[i].y;

			nextControlPoints.push(new point(x, y)); 
		}

		//Shallow copy here as well
		points = nextControlPoints.slice();
	}

	return points[0];
}

//Creates a single point
function point(x, y) {
	this.x = x;
	this.y = y;
}

//Setting the fill color of the canvas
function fillCanvas() {
	ctx.fillStyle = `rgb(255, 213, 253)`;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
}

//Drawing the axes of the Cartesian coordinate system (two-dimensional)
function drawCartesianCoordinateSystem() {
	const width = canvas.width;
	const height = canvas.height;
	const startOfX = 0;
	const startOfY = 0;

	//Coordinates of the x-axis
	const xStartOfAxisX = startOfX;
	const xEndOfAxisX = width;
	const yOfAxisX = canvas.height / 2;

	//Coordinates of the y-axis
	const yStartOfAxisY = startOfY;
	const yEndOfAxisY = height;
	const xOfAxisY = canvas.width / 2;

	//The following two lines draw the two axes (x, y)
	drawLine(new point(xStartOfAxisX, yOfAxisX), new point(xEndOfAxisX, yOfAxisX));
	drawLine(new point(xOfAxisY, yStartOfAxisY), new point(xOfAxisY, yEndOfAxisY));

	//The next four pairs of lines are responsible for drawing the arrows of each of the ends
	//of the axes, trough the use of simple little pieces of lines (15 units of length each)...
	
	//The arrow on the left
	drawLine(new point(xStartOfAxisX + 15, yOfAxisX + 15), new point(xStartOfAxisX, yOfAxisX));
	drawLine(new point(xStartOfAxisX + 15, yOfAxisX - 15), new point(xStartOfAxisX, yOfAxisX));
	
	//The arrow on the right
	drawLine(new point(xEndOfAxisX - 15, yOfAxisX - 15), new point(xEndOfAxisX, yOfAxisX));
	drawLine(new point(xEndOfAxisX - 15, yOfAxisX + 15), new point(xEndOfAxisX, yOfAxisX));

	//The arrow on the top
	drawLine(new point(xOfAxisY + 15, yStartOfAxisY + 15), new point(xOfAxisY, yStartOfAxisY));
	drawLine(new point(xOfAxisY - 15, yStartOfAxisY + 15), new point(xOfAxisY, yStartOfAxisY));

	//The arrow on the bottom
	drawLine(new point(xOfAxisY + 15, yEndOfAxisY - 15), new point(xOfAxisY, yEndOfAxisY));
	drawLine(new point(xOfAxisY - 15, yEndOfAxisY - 15), new point(xOfAxisY, yEndOfAxisY));

	//Below we are drawing the identifiers of the axes' directions
	ctx.font = "30px Arial";
	ctx.fillStyle = "blue";
	
	//Setting the letters for the leftmost arrow, the rightmost arrow, the topmost arrow
	//and the bottommost arrow, respectively
	ctx.fillText("T", 7, yOfAxisX - 20);
	ctx.fillText("x", canvas.width - 27, yOfAxisX + 35);
	ctx.fillText("y", xOfAxisY + 17, 21);
	ctx.fillText("T", xOfAxisY - 35, canvas.height - 3);
}

function isPointInFirstQuadrant(point) {
	const width = canvas.width;
	const height = canvas.height;
	const yOfAxisX = height / 2;
	const xOfAxisY = width / 2;
	
	//Making sure the User can only draw points in the 1st quadrant of the coordinate system
	return (point.x >= xOfAxisY && point.x <= width && point.y <= yOfAxisX && point.y >= 0);
}

//The following two functions are responsible for implementing the Crossplot:
//One computes the points that lie on the Fourth quadrant /x(t)/, and the other
//computes the points that lie on the Second quadrant /y(t)/.

//Calculates the points of x(t)
function calculateFourthQuadrantPoints() {
	//Calculating the location of the border between 1st and 4th quadrant of the coordinate system
	//In other words, the border is a line equivalent to y = 0
	var quadrantHeight = canvas.height / 2;

	//Getting the current number of control points and adding 1
	//in order to calculate what the distance between each of the points of x(t) would be with respect to Y.
	//The distance between each one of the points is equal to the distance between the border line (y = 0)
	//and the first point, and the distance between the last point and the lower end of the coordinate system
	//in the canvas. This is the very reason we are incrementing the number of control points by one:
	//we want to split the space in the 4th quadrant into |currentControlPoints.length + 1| equal parts.
	//Note that this way the curve never starts from y = 0 and never touches the lower boundary of the quadrant, either
	var length = currentControlPoints.length + 1;
	var elevationCoefficient = quadrantHeight / length;

	for (var i = 1; i <= currentControlPoints.length; ++i) {

		//On every iteration we are getting the x-coordinate of the current control point and then
		//computing its y-coordinate in the way that was mentioned above: we set every point on the same
		//distance from one another based solely on the number of points and the length of the quadrant
		var x = currentControlPoints[i - 1].x;
		var y = quadrantHeight + i * elevationCoefficient;
		
		//Then, we simply add the computed point to the array of points for x(t)
		currentXPoints.push(new point(x, y));
	}
}

//Calculates the points of y(t)
function calculateSecondQuadrantPoints() {
	//Similarly to the above function, but with respect to X, calculating the location of the border between
	//1st quadrant and 2nd quadrant (in other words, the line equivalent to x = 0)
	var quadrantWidth = canvas.width / 2;

	//Just like for x(t), we get the current number of control points and add 1, so as to split the quadrant into
	//|currentControlPoints.length + 1| equal parts, but this time, with respect to X.
	var length = currentControlPoints.length + 1;
	var displacementCoefficient = quadrantWidth / length;

	for (var i = 1; i <= currentControlPoints.length; ++i) {

		//On every iteration we are getting the x-coordinate of the new point by setting it to a static distance
		//from the previous point (or to the line x = 0), then we get the y-coordinate by extracting the y-coordinate
		//of the current control point
		var x = quadrantWidth - i * displacementCoefficient;
		var y = currentControlPoints[i - 1].y;

		//Adding the computed point to the array of points for y(t)
		currentYPoints.push(new point(x, y));
	}
}