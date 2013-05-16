// copied https://github.com/fzaninotto/CodeFlower/ and modified to suit a generic csv file that has the format:
// filename, attr1, attr2...

var convertToJSON = function(data) {
  var json = {};
  var elements, current;
  data.forEach(function(line) {

      elements = line.filePath.split(/[\/\\]/);
      current = json;
      elements.forEach(function(element) {
          if (!current[element]) {
              current[element] = {};
          }
          current = current[element];
      });
      //todo: replace with generic copy of all attrs
      current.known = line.known;
      current.size = line.size;
      current.filePath = line.filePath;
  });

  json.children = getChildren(json,"");
  json.name = 'root';

  return json;
};

/**
 * Convert a simple json object into another specifying children as an array
 * Works recursively
 *
 * example input:
 * { a: { b: { c: { size: 12 }, d: { size: 34 } }, e: { size: 56 } } }
 * example output
 * { name: a, children: [
 *   { name: b, children: [
 *     { name: c, size: 12 },
 *     { name: d, size: 34 }
 *   ] },
 *   { name: e, size: 56 }
 * ] } }
 */
var getChildren = function(json,p) {
  var children = [];

  if (json.hasOwnProperty("known")) return children;

  for (var key in json) {
    var child = { name: key, parentNode:p };
    if (json[key].hasOwnProperty("known")) {
      // value node

      //todo: replace with generic copy of all attrs
      child.known = json[key].known;
      child.size = json[key].size;
      child.filePath = json[key].filePath;
    } else {
      // children node
      var childChildren = getChildren(json[key],key);
      if (childChildren) child.children = childChildren;
    }
    children.push(child);
    delete json[key];
  }
  return children;
};


// calculate total known and unknown objects in tree based on the known attr.
// if node.known = 1, known++
// if node.known = 0, unknown++

var calcTotals = function(node){
  // counts for a node is the sum of counts for its children
  // counts for a leaf node is just +1 for one of the two counts
  if(node.children){
    // recursively count all children. that is the count for this node
    var totals = { known: 0, unknown: 0};
    var ret = node.children.reduce(function(p,v){
      var vchildTotals = calcTotals(v);
      return {known: p.known+vchildTotals.known, unknown: p.unknown+vchildTotals.unknown};
    },totals);
    return ret;

  }else{
    if(node.hasOwnProperty("known")){
      return {
        known: (node.known == 1) ? 1 : 0,
        unknown: (node.known == 0) ? 1 : 0
      }
    }
    return { known: 0, unknown: 0};
  }
};
