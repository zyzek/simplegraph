function circleIntersections(x0, y0, r0, x1, y1, r1) {
    let d = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));

    if (d > (r0 + r1) || 
        d < Math.abs(r1 - r0) ||
        d == 0 && r0 == r1) {
        return [];
    }

    let b0 = (r0*r0 - r1*r1 + Math.pow(d, 2))/(2*d);
    let h = Math.sqrt(r0*r0 - b0*b0);

    let x = x1 - x0;
    let y = y1 - y0;
    
    let p0 = {x: x0 + (b0*x - h*y)/d, y: y0 + (b0*y + h*x)/d};
    let p1 = {x: x0 + (b0*x + h*y)/d, y: y0 + (b0*y - h*x)/d};
    
    return [p0, p1];
}

class Node {
    constructor(pos, label="", style="") {
        this.pos = pos
        this.label = label
	this.style = style;
	this.out_edges = [];
	this.in_edges = [];
    }

    draw(ctx, settings) {
	ctx.save();
	let transpos = settings.applyTransform(this.pos);
        
        ctx.beginPath();
        ctx.arc(transpos.x, transpos.y, 
                settings.scaledRad(),
                0, 2*Math.PI);	
        ctx.closePath();
	ctx.fill();
	ctx.stroke();	
	
        if (this.style == "double") {
            ctx.beginPath();
            ctx.arc(transpos.x, transpos.y, 
                    settings.scaledRad() * 0.8,
                    0, 2*Math.PI);
            ctx.closePath();
	    ctx.fill();
	    ctx.stroke();
        }

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = settings.font;
	ctx.fillStyle = "black";
        ctx.fillText(this.label, transpos.x, transpos.y);
	ctx.restore()
    }

}


class Edge {
    constructor(head, tail, label="") {
        this.head = head;
        this.tail = tail;
	this.is_loop = (this.head == this.tail);
        this.label = label;
	this.loop_angle = Math.PI/2;
    }

    length() {
	return Math.sqrt(Math.pow(this.head.pos.x - this.tail.pos.x, 2) +
			 Math.pow(this.head.pos.y - this.tail.pos.y, 2));
    }
    
    vector() {
        let v_x = this.tail.pos.x - this.head.pos.x;
        let v_y = this.tail.pos.y - this.head.pos.y;
        return {x: v_x, y: v_y};
    } 

    unit() {
        let len = this.length();
	let v = this.vector();
        return {x: v.x/len, y: v.y/len};
    }

    normal_unit() {
	let unit = this.unit();
        return {x: -unit.y, y: unit.x};
    }

    getCentrePosition(normal_offset = 0) {
	var base_x = (this.head.pos.x + this.tail.pos.x)/2;
	var base_y = (this.head.pos.y + this.tail.pos.y)/2;
	
	if (normal_offset != 0) {
            let normal_unit = this.normal_unit();
	    base_x += normal_unit.x * normal_offset;
	    base_y += normal_unit.y * normal_offset;
        }
	
	return {x: base_x, y: base_y};
    }
    
    drawArrow(ctx, settings, arrow_tip, unit) {
        let nu = {x: -unit.y, y: unit.x};
	let arrow_len = settings.scaledRad()*settings.arrow_len_frac;
	let arrow_wid = settings.scaledRad()*settings.arrow_wid_frac;

	ctx.beginPath();
	ctx.moveTo(arrow_tip.x, arrow_tip.y);
	ctx.lineTo(arrow_tip.x - unit.x*arrow_len + nu.x*arrow_wid/2,
                   arrow_tip.y - unit.y*arrow_len + nu.y*arrow_wid/2);
	ctx.lineTo(arrow_tip.x - unit.x*arrow_len - nu.x*arrow_wid/2,
                   arrow_tip.y - unit.y*arrow_len - nu.y*arrow_wid/2);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
    }
 
    draw(ctx, settings, anti_parallel=false) {
	if (this.is_loop) {
	    this.drawSelfLoop(ctx, settings);
	}
	else {
	    this.drawEdge(ctx, settings, anti_parallel);
	}
    }
       
    drawSelfLoop(ctx, settings) {
        ctx.save();
        ctx.fillStyle = "black";
        ctx.strokeStyle = "black";
	let scaled_node_rad = settings.scaledRad();
	let node_pos = settings.applyTransform(this.head.pos);
	let loop_rad = settings.loop_radius_frac*scaled_node_rad;
	let loop_unit = {x: Math.cos(this.loop_angle),
			 y: Math.sin(this.loop_angle)};
	let loop_pos = {x: loop_unit.x*scaled_node_rad + node_pos.x,
	                y: loop_unit.y*scaled_node_rad + node_pos.y};
	let label_pos = {x: loop_unit.x*(scaled_node_rad + loop_rad*2) + node_pos.x,
			 y: loop_unit.y*(scaled_node_rad + loop_rad*2) + node_pos.y};
	
        ctx.beginPath();
        ctx.arc(loop_pos.x, loop_pos.y, 
                loop_rad,
                0, 2*Math.PI);	
        ctx.closePath();

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = settings.font;
	ctx.fillStyle = "black";
	let offset = settings.edge_label_offset;
        ctx.fillText(this.label, label_pos.x, label_pos.y);
	
        ctx.stroke();
	
        let intersections = circleIntersections(node_pos.x, node_pos.y, scaled_node_rad,
						loop_pos.x, loop_pos.y, loop_rad);
	let p = intersections[0];
        let arr_x = node_pos.x - p.x;
        let arr_y = node_pos.y - p.y;
        let len = Math.sqrt(arr_x*arr_x + arr_y*arr_y);
        let unit = {x: arr_x/len, y: arr_y/len};
        this.drawArrow(ctx, settings, p, unit);
            
	ctx.restore();
    }

    drawEdge(ctx, settings, anti_parallel=false) {
        ctx.save();
        ctx.fillStyle = "black";
        ctx.strokeStyle = "black";
	
	let edge_offset_frac = 0.2

        let unit = this.unit();
        let nu = this.normal_unit();
	var para_offset = {x: 0, y: 0};
	if (anti_parallel) {
            let os = settings.node_radius * edge_offset_frac;
	    para_offset = settings.scaleVector({x: nu.x*os, y: nu.y*os});
        }


        let htrans = settings.applyTransform(this.head.pos);
        let ttrans = settings.applyTransform(this.tail.pos);
	ctx.beginPath();
        ctx.moveTo(htrans.x + para_offset.x, 
		   htrans.y + para_offset.y);
        ctx.lineTo(ttrans.x + para_offset.x, 
		   ttrans.y + para_offset.y);
	ctx.closePath();

        ctx.fill();
        ctx.stroke();

	let offset_len_sq = para_offset.x*para_offset.x
                          + para_offset.y*para_offset.y;
	let scaled_rad_sq = Math.pow(settings.scaledRad(), 2);
	let arrow_dist = Math.sqrt(scaled_rad_sq - offset_len_sq);
	let arrow_tip = {x: ttrans.x + para_offset.x - unit.x*arrow_dist,
		         y: ttrans.y + para_offset.y - unit.y*arrow_dist};

	this.drawArrow(ctx, settings, arrow_tip, unit);

        ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = settings.font;
	ctx.fillStyle = "black";
	let offset = settings.edge_label_offset;
        let mid = settings.applyTransform(this.getCentrePosition(offset));
        ctx.fillText(this.label, mid.x + para_offset.x,
				 mid.y + para_offset.y);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}


class RenderSettings {
    constructor() {
        this.zoom = 1;
        this.offsets = {x: 0, y: 0};
	this.node_radius = 1;
	this.loop_radius_frac = 0.5;
	this.arrow_len_frac = 0.25;
	this.arrow_wid_frac = 0.125;
	this.font = "10px sans-serif";
	this.edge_label_offset = 0;
    }

    applyTransform(pos) {
        return {x: this.scaleDist(pos.x) + this.offsets.x,
                y: this.scaleDist(pos.y) + this.offsets.y}
    }

    scaleVector(pos) {
	return {x: pos.x*this.zoom, y: pos.y*this.zoom};
    }

    scaleDist(d) {
        return d*this.zoom
    }

    scaledRad() {
        return this.scaleDist(this.node_radius);
    }
}


class GraphDrawer {
    constructor(canvas) {
        this.canvas = canvas;
        this.nodes = {};
        this.edges = [];
        this.settings = new RenderSettings();
	this.rend_bound_positions = []
    }

    addNode(name, x, y, label="", style="") {
        if (!(name in this.nodes)) {
	    this.nodes[name] = new Node({x: x, y: y}, label, style);
        }
    }
    
    addEdge(hname, tname, label="") {
        if (hname in this.nodes && tname in this.nodes) {
	    let head = this.nodes[hname];
            let tail = this.nodes[tname];
	    for (let edge of head.out_edges) {
	        if (edge.tail == tail) {
		    return edge;
		}
            }
	    
            let edge = new Edge(head, tail, label);
            head.out_edges.push(edge);
            tail.in_edges.push(edge);
            this.edges.push(edge);
	    
            return edge;
        }
    }
	
    addSelfLoop(name, label="", angle=Math.PI/2) {
	let edge = this.addEdge(name, name, label);
	edge.loop_angle = angle;
	return edge;
    }
    
    addInEdge(name, angle=Math.PI, len=3) {
	if (name in this.nodes) {
	    let node = this.nodes[name];
	    var newpos = {x: node.pos.x + Math.cos(angle)*(len + this.settings.node_radius), 
			  y: node.pos.y + Math.sin(angle)*(len + this.settings.node_radius)};
	    
            this.edges.push(new Edge(new Node(newpos), node));
            this.rend_bound_positions.push(newpos);
        }
    }
    
    extremeCoords() {
        var extremes = {max: {x: undefined, y: undefined},
                        min: {x: undefined, y: undefined}};
	var positions = [];
        for (let key in this.nodes) {
            if (this.nodes.hasOwnProperty(key)) {
		let pos = this.nodes[key].pos;
	        positions.push(this.nodes[key].pos);
            }
        }

	for (let pos of positions) {
	    if (extremes.max.x == undefined) {
                extremes.max.x = pos.x + this.settings.node_radius;
	    }
	    else {
                extremes.max.x = Math.max(extremes.max.x,
					  pos.x + this.settings.node_radius);
            }
		
	    if (extremes.min.x == undefined) {
                extremes.min.x = pos.x - this.settings.node_radius;
            }
	    else {
                extremes.min.x = Math.min(extremes.min.x,
					  pos.x - this.settings.node_radius);
	    }
	
  	    if (extremes.max.y == undefined) {
	        extremes.max.y = pos.y + this.settings.node_radius;
	    }
	    else {
                extremes.max.y = Math.max(extremes.max.y,
					  pos.y + this.settings.node_radius);
	    }
		
	    if (extremes.min.y == undefined) {
	        extremes.min.y = pos.y - this.settings.node_radius;
	    }
	    else {
                extremes.min.y = Math.min(extremes.min.y,
					  pos.y - this.settings.node_radius);
	    }
        }

        for (let pos of this.rend_bound_positions) {
	    if (extremes.max.x == undefined) {
                extremes.max.x = pos.x;
	    }
	    else {
                extremes.max.x = Math.max(extremes.max.x, pos.x);
            }
		
	    if (extremes.min.x == undefined) {
                extremes.min.x = pos.x
            }
	    else {
                extremes.min.x = Math.min(extremes.min.x, pos.x);
	    }
	
  	    if (extremes.max.y == undefined) {
	        extremes.max.y = pos.y;
	    }
	    else {
                extremes.max.y = Math.max(extremes.max.y, pos.y);
	    }
		
	    if (extremes.min.y == undefined) {
	        extremes.min.y = pos.y;
	    }
	    else {
                extremes.min.y = Math.min(extremes.min.y, pos.y);
	    }
        }

	return extremes;
    }
    
    draw() {
        var ctx = this.canvas.getContext("2d");
        var height = this.canvas.height;
        var width = this.canvas.width;

	let extremes = this.extremeCoords();

	let pad = this.settings.node_radius;

	let x_width = extremes.max.x - extremes.min.x;
	let y_height = extremes.max.y - extremes.min.y;
	let x_zoom = width/(x_width + pad == 0 ? width : x_width + pad);
	let y_zoom = height/(y_height + pad == 0 ? height : y_height + pad);
	let zoom = Math.min(x_zoom, y_zoom);
	var offsets = {x: (width - x_width*zoom)/2 - zoom*extremes.min.x, 
		       y: (height - y_height*zoom)/2 - zoom*extremes.min.y};
        
	this.settings.zoom = zoom;
	this.settings.offsets = offsets;

	ctx.fillStyle = "white";

	for (let edge of this.edges) {
	    var anti_parallel = false;

            for (let e of edge.tail.out_edges) {
		if (e.tail == edge.head) {
                    anti_parallel = true;
                }
            }

            edge.draw(ctx, this.settings, anti_parallel);
        }

	for (let key in this.nodes) {
            if (this.nodes.hasOwnProperty(key)) {
                this.nodes[key].draw(ctx, this.settings);
            }
        }
	
    }
}
