// devmetrix.js: all the devmetrix logic

var margin = {top: 40, right: 10, bottom: 10, left: 0},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var BORDERWIDTH = 1;  // change this to control width of the borders of all divs.

var div = d3.select("#container")
    .style("position", "relative")
    .style("width", (width + margin.left + margin.right) + "px")
    .style("height", (height + margin.top + margin.bottom) + "px")
    .style("left", margin.left + "px")
    .style("top", margin.top + "px");

var bgColor = d3.scale.ordinal()
              .domain([0,1])
              .range(['red', 'green']);

var borderColor = d3.scale.category20c();

var fileList;

d3.csv("data/sources.csv", function (d) {
  return { name: d.name, filePath: d.filePath};
},
function (error,data) {
  fileList = d3.nest()
                .key(function(d){ return d.name; })
                .map(data,d3.map)
                ;

  var list = d3.select("#codebase").append("select");
  list.selectAll("option")
    .data(fileList.keys())
    .enter()
    .append("option")
    .attr("value", function(d){ return d; })
    .text(function(d){ return d; })
  ;

  list.on("change", function change(){
    var currSrc = fileList.get(this.value)[0];
    loadCRData(currSrc.name,currSrc.filePath);
  });

  loadCRData(data[0].name, data[0].filePath);
});

function loadCRData(name, filePath){
  d3.csv(filePath,function(d){
      return { filePath:d.filePath, size: + d.size, known: +d.known };
    }, 
    function(error,data){
      var json = convertToJSON(data);

      // clear any existing treemap
      div.selectAll(".node")
        .data([])
        .exit().remove();

      var treemap = d3.layout.treemap()
          .size([width, height])
          .sticky(true)
          .value(function(d) { 
            return d.size; 
          });

      var node = div.datum(json).selectAll(".node")
          .data(treemap.nodes)
        .enter().append("div")
          .attr("class", "node")
          .call(position)
          .text(function(d) { return d.children ? null : d.name;})
          .attr("title", function(d) { return d.children ? null : d.filePath;})
          .style("background", function(d) { 
            // console.log(d.name + "," + d.known + "," + color(d.known)); 
            return d.children ? null : bgColor(d.known); 
          })
          .style("border", "solid "+ BORDERWIDTH +"px white")
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
    var totals = calcTotals(json);
    var ratio = totals.known / (totals.known + totals.unknown) * 100;

    // d3.select("#codebase").text(name);
    d3.select("#ratio").text(ratio.toFixed(2));
    d3.select("#numKnown").text(totals.known);
    d3.select("#numUnknown").text(totals.unknown);
  });

}

function position() {
  this.style("left", function(d) { return d.x + "px"; })
      .style("top", function(d) { return d.y + "px"; })
      .style("width", function(d) { return Math.max(0, d.dx - BORDERWIDTH) + "px"; })
      .style("height", function(d) { return Math.max(0, d.dy - BORDERWIDTH) + "px"; });
}

