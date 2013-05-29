// devmetrix.js: all the devmetrix logic

// globals
var margin, width, height, BORDERWIDTH;  // CR container level global attributes
var container;  // CR container itself.
var cellColor, borderColor; // CR treemap level globals

setGlobals();
initContainer();
initTreemap();

function setGlobals () {
  // margin = {top: 40, right: 10, bottom: 10, left: 0},
  //   width = 700 - margin.left - margin.right,
  //   height = 500 - margin.top - margin.bottom;

  BORDERWIDTH = 1;  // change this to control width of the borders of all divs.
  
  borderColor = d3.scale.category20c();

  container = d3.select("#container");
  legend = d3.select("#legend");
}

function initContainer () {
  // container
  //   .style("position", "relative")
  //   .style("float", "left")
  //   .style("width", (width + margin.left + margin.right) + "px")
  //   .style("height", (height + margin.top + margin.bottom) + "px")
  //   .style("left", margin.left + "px")
  //   .style("top", margin.top + "px");

  // legend
  //   .style("position", "relative")
  //   .style("float", "right")
  //   .style("left", margin.left + "px")
  //   .style("top", margin.top + "px");
}

function initTreemap(){
  // in a synchronous world this function would have the structure below:
  //    cellColor = getColorScale();  -- read colorscale.json
  //    sources = getSources();       -- read sources.csv
  //    setupCodeBaseSelector(sources); 
  //    showCRStatus(sources[0]);     -- read each data.csv and display it.
  // since we're not in such a world, however, each step above is nested in the callback for the previous.

  d3.json("data/colorscale.json", function(error,json){
    if(!error){
      cellColor = d3.scale.ordinal()
                .domain(json.values)
                .range(json.colors);
    }else{
      cellColor = d3.scale.ordinal()
              .domain([0,1])
              .range(['red', 'green']);
    }

    d3.csv("data/sources.csv", function (d) {
      return { name: d.name, filePath: d.filePath, extraInfo: d.extraInfo};
    },
    function (error,data) {
      var fileList = mapNameToFile(data);
      setupCodeBaseSelector(fileList);    
      // initialize the display with the first codebase
      showCRStatus(data[0]);
    });

  });
}

function mapNameToFile (data) {
  return d3.nest()
              .key(function(d){ return d.name; })
              .map(data,d3.map)
          ;
}

function setupCodeBaseSelector (fileList) {
  // initialize the drop down
  var list = d3.select("#codebase").append("select");
  list.selectAll("option")
    .data(fileList.keys())
    .enter()
    .append("option")
    .attr("value", function(d){ return d; })
    .text(function(d){ return d; })
  ;

  // setup listener for user choice
  list.on("change", function change(){
    var currSrc = fileList.get(this.value)[0];
    showCRStatus(currSrc);
  });
}

function showCRStatus(src){
  var filePath = src.filePath;
  var extraInfo = src.extraInfo;

  d3.csv(filePath,function(d){
      return { filePath:d.filePath, size: + d.size, known: +d.known };
    }, 
    function(error,data){
      // debug print that hinted at Chrome's cashing xhr responses
      // console.log(data);
      var json = convertToJSON(data);

      clearCurrentTreemap();
      displayNewTreemap(json);
      refreshHeader(json);
      refreshExtraInfo(extraInfo);
  });

}

function clearCurrentTreemap () {
  container.selectAll(".node")
    .data([])
    .exit().remove();
}

function displayNewTreemap (json) {
  var treemap = d3.layout.treemap()
      .size([98,98])  // these are percentage sizes. d3 is truly unit agnostic!
      .padding(.01)
      .value(function(d) { 
        return d.size; 
      });

  var node = container.datum(json).selectAll(".node")
      .data(treemap.nodes)
    .enter().append("div")
      .attr("class", "node")
      .call(position)
      .text(function(d) { return d.children ? null : d.name;})
      .attr("title", function(d) { return d.children ? null : d.filePath;})
      .style("background", function(d) { 
        // console.log(d.name + "," + d.known + "," + color(d.known)); 
        return d.children ? null : cellColor(d.known); 
      })
      // .style("border", "solid "+ BORDERWIDTH +"px white")
      // added border as an experiment to show containment but that's more distracting than useful.
      // .style("border", function(d) { 
      //   var b = "2px solid " + (d.children ? "" : borderColor(d.parentNode)); 
      //   console.log(d.name + "," + d.known + "," + d.parentNode + "," + b); 
      //   return b;
      // })
  ;

  // d3.selectAll("input").on("change", function change() {
  //   var value = this.value === "count"
  //       ? function() { return 1; }
  //       : function(d) { return d.size; };

  //   node
  //       .data(treemap.value(value).nodes)
  //     .transition()
  //       .duration(1500)
  //       .call(position);
  // });

}

function refreshHeader (json) {
  var totals = calcTotals(json);
  var ratio = totals.known / (totals.known + totals.unknown) * 100;

  // d3.select("#codebase").text(name);
  d3.select("#ratio").text(ratio.toFixed(2));
  d3.select("#numKnown").text(totals.known);
  d3.select("#numUnknown").text(totals.unknown);
}

function refreshExtraInfo (extraInfo) {
  d3.select("#extraInfo").text(extraInfo);
}

function position() {
  this.style("left", function(d) { return d.x + "%"; })
      .style("top", function(d) { return d.y + "%"; })
      .style("width", function(d) { return Math.max(0, d.dx) + "%"; })
      .style("height", function(d) { return Math.max(0, d.dy) + "%"; });
}

