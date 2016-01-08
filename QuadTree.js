/*
 * Javascript Quadtree
 * @version 1.1.1
 * @licence MIT
 * @author flamurey
 * https://github.com/flamurey/quadtree-js\
 */

/*
 Copyright © 2016 flamurey
 Copyright © 2012 Timo Hausmann
 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:
 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENthis. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

;(function (window) {

    /*
     * Quadtree Constructor
     * @param Object bounds		bounds of the node, object with top, right, bottom, left, and where top > bottom
     * @param Integer max_objects		(optional) max objects a node can hold before splitting into 4 subnodes (default: 10)
     * @param Integer max_levels		(optional) total max levels inside root Quadtree (default: 4)
     * @param Integer level		(optional) deepth level, required for subnodes
     */
    function Quadtree(bounds, max_objects, max_levels, level) {

        this.max_objects = max_objects || 10;
        this.max_levels = max_levels || 4;

        this.level = level || 0;
        bounds.width = bounds.right - bounds.left;
        bounds.height = bounds.top - bounds.bottom;
        this.bounds = bounds;

        this.objects = [];
        this.nodes = [];
    };


    Quadtree.prototype.ALL_NODES = [0, 1, 2, 3];

    /*
     * Split the node into 4 subnodes
     */
    Quadtree.prototype.split = function () {

        var nextLevel = this.level + 1;
        var horMidpoint = this.bounds.left + this.bounds.width / 2;
        var verMidpoint = this.bounds.bottom + this.bounds.height / 2;

        //bottom right node
        this.nodes[0] = new Quadtree({
            left: horMidpoint,
            bottom: this.bounds.bottom,
            right: this.bounds.right,
            top: verMidpoint
        }, this.max_objects, this.max_levels, nextLevel);

        //bottom left node
        this.nodes[1] = new Quadtree({
            left: this.bounds.left,
            bottom: this.bounds.bottom,
            right: horMidpoint,
            top: verMidpoint
        }, this.max_objects, this.max_levels, nextLevel);

        //top left node
        this.nodes[2] = new Quadtree({
            left: this.bounds.left,
            bottom: verMidpoint,
            right: horMidpoint,
            top: this.bounds.top
        }, this.max_objects, this.max_levels, nextLevel);

        //top right node
        this.nodes[3] = new Quadtree({
            left: horMidpoint,
            bottom: verMidpoint,
            right: this.bounds.right,
            top: this.bounds.top
        }, this.max_objects, this.max_levels, nextLevel);
    };


    /*
     * Determine which node the object belongs to
     * @param Object pRect		rect{left, top, right, bottom} where top > bottom
     * @return Array<Integer>		index of the subnode (0-3) which hit
     */
    Quadtree.prototype.getIndexForRect = function (pRect) {

        //check if all nodes within in pRect
        if (this.bounds.left >= pRect.left
            && this.bounds.right <= pRect.right
            && this.bounds.bottom >= pRect.bottom
            && this.bounds.top <= pRect.top) {
            return this.ALL_NODES;
        }

        var indexes = [];
        for (var i = 0; i < 4; i++) {
            if (this.nodes[i].hasIntersection(pRect)) {
                indexes.push(i)
            }
        }

        return indexes;
    };

    Quadtree.prototype.hasIntersection = function (pRect) {
        return !(pRect.right < this.bounds.left
        || this.bounds.right < pRect.left
        || pRect.top < this.bounds.bottom
        || this.bounds.top < pRect.bottom);
    };

    Quadtree.prototype.getIndexForPoint = function (point) {

        var index = -1,
            horizontalMidpoint = this.bounds.left + (this.bounds.width / 2),
            verticalMidpoint = this.bounds.bottom + (this.bounds.height / 2);

        if (point.lon > horizontalMidpoint) {
            if (point.lat > verticalMidpoint) {
                index = 3;
            } else {
                index = 0;
            }
        } else {
            if (point.lat > verticalMidpoint) {
                index = 2;
            } else {
                index = 1;
            }
        }
        return index;
    };


    /*
     * Insert the object into the node. If the node
     * exceeds the capacity, it will split and add all
     * objects to their corresponding subnodes.
     * @param Object point		point object with lon and lat fields
     */
    Quadtree.prototype.insert = function (point) {

        var i = 0,
            index;

        //if we have subnodes ...
        var hasSubNodes = typeof this.nodes[0] !== 'undefined';
        if (hasSubNodes) {
            index = this.getIndexForPoint(point);

            if (index !== -1) {
                this.nodes[index].insert(point);
                return;
            }
        }

        this.objects.push(point);

        if (this.objects.length > this.max_objects && this.level < this.max_levels && !hasSubNodes) {

            //split if we don't already have subnodes
            if (typeof this.nodes[0] === 'undefined') {
                this.split();
            }

            //add all objects to there corresponding subnodes
            while (i < this.objects.length) {

                index = this.getIndexForPoint(this.objects[i]);

                if (index !== -1) {
                    this.nodes[index].insert(this.objects.splice(i, 1)[0]);
                } else {
                    i = i + 1;
                }
            }
        }
    };


    /*
     * Return all objects that could collide with the given object
     * @param Object pRect		rect{left, top, right, bottom} where top > bottom
     * @Return Array		array with all detected objects
     */
    Quadtree.prototype.retrieve = function (pRect) {
        var returnObjects = this.objects;
        //if we have subnodes ...
        if (typeof this.nodes[0] !== 'undefined') {
            var indexes = this.getIndexForRect(pRect);

            for (var i = 0; i < indexes.length; i++) {
                returnObjects = returnObjects.concat(this.nodes[indexes[i]].retrieve(pRect));
            }
        }

        return returnObjects;
    };


    /*
     * Clear the quadtree
     */
    Quadtree.prototype.clear = function () {

        this.objects = [];

        for (var i = 0; i < this.nodes.length; i = i + 1) {
            if (typeof this.nodes[i] !== 'undefined') {
                this.nodes[i].clear();
            }
        }

        this.nodes = [];
    };

    //make Quadtree available in the global namespace
    window.Quadtree = Quadtree;

})(window);