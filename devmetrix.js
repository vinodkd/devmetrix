// devmetrix.js: all the devmetrix logic

// globals
var container;  // CR container itself.
var cellColor, borderColor; // CR treemap level globals

setGlobals();
initTreemap();

function setGlobals () {
  borderColor = d3.scale.category20c();

  container = d3.select("#container");
  legend = d3.select("#legend");
}

function initTreemap(){
  // in a synchronous world this function would have the structure below:
  //    cellColor = getColorScale();  -- read colorscale.json
  //    sources = getSources();       -- read sources.csv
  //    setupCodeBaseSelector(sources); 
  //    showCRStatus(sources[0]);     -- read each data.csv and display it.
  // since we're not in such a world, however, each step above is nested in the callback for the previous.

  var value2colorMap = {
    statuses: ["Unknown", "Known"],
    values: [0, 1],
    colors: ['red', 'green']
  };

  d3.json("data/colorscale.json", function(error,json){
    if(!error){
      value2colorMap = json;
    }
    cellColor = d3.scale.ordinal()
                    .domain(value2colorMap.values)
                    .range(value2colorMap.colors);

    d3.csv("data/sources.csv", function (d) {
      return { name: d.name, filePath: d.filePath, extraInfo: d.extraInfo};
    },
    function (error,data) {
      var fileList = mapNameToFile(data);
      setupCodeBaseSelector(fileList,value2colorMap);    
      // initialize the display with the first codebase
      showCRStatus(data[0], value2colorMap);
    });

  });
}

function mapNameToFile (data) {
  return d3.nest()
              .key(function(d){ return d.name; })
              .map(data,d3.map)
          ;
}

function setupCodeBaseSelector (fileList,value2colorMap) {
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
    showCRStatus(currSrc,value2colorMap);
  });
}

function showCRStatus(src, value2colorMap){
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
      var counts = calcCounts(json,value2colorMap);
      refreshHeader(counts);
      refreshLegend(counts,value2colorMap);
      refreshExtraInfo(extraInfo);
  });

}

function clearCurrentTreemap () {
  container.selectAll(".node")
    .data([])
    .exit().remove();
  legend.selectAll(".lline").remove();
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
}

function refreshHeader(counts){
  d3.select("#numKnown").text(counts["Known"]);
  d3.select("#numTotal").text(counts["total"]);
}

function refreshLegend (counts,value2colorMap) {
  value2colorMap.statuses.forEach(function (s,i){
    var lline=legend.append("div").attr("class","lline");
    lline
      .append("div")
        .text(s)
        .attr("class","ltext lstatus")
        .style("background", value2colorMap.colors[i]);
    lline
      .append("div")
        .attr("class","ltext lcount")
        .text(counts[s])
      ;
  });

  var lline=legend.append("div").attr("class","lline");
  lline
    .append("div")
    .text("Total")
        .attr("class","ltext lstatus")
        .style("background", "lightgray");
  lline
    .append("div")
      .attr("class","ltext lcount")
      .text(counts["total"])
    ;
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

