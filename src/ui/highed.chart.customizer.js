/******************************************************************************

Copyright (c) 2016, Highsoft

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
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

******************************************************************************/

/** UI For customizing a chart
 *  @todo there be dragons here.
 *  @example
 *  var chart = highed.ChartCustomizer(document.body);
 *  console.log(chart.export.html());
 *
 *  @constructor
 *
 *  @emits PropertyChange - when a property changes
 *    > {string} - the path of the change
 *    > {anything} - the new value
 *    > {number} - the change array index
 *
 *  @param parent {domnode} - the node to attach the editor to
 *  @param attributes {object} - the attributes
 *    > noAdvanced {bool} - set to false to force disable the advance view
 *    > availableSettings {string|array} - whitelist of exposed settings
 */
highed.ChartCustomizer = function (parent, attributes) {
    var properties = highed.merge({
            noAdvanced: false,
            availableSettings: []
        }, attributes),
        events = highed.events(),
        tabs = highed.TabControl(parent, true),
        simpleTab = tabs.createTab({title: highed.getLocalizedStr('customizeSimple')}),
        advancedTab = tabs.createTab({title: highed.getLocalizedStr('customizeAdvanced')}),
        
        splitter = highed.HSplitter(simpleTab.body, {leftWidth: 30, responsive: true}),
        list = highed.List(splitter.left, true),
        body = splitter.right,

        advSplitter = highed.HSplitter(advancedTab.body, {leftWidth: 30}),
        advBody = advSplitter.right,
        advTree = highed.Tree(advSplitter.left),

        flatOptions = {},
        chartOptions = {},

        highlighted = false
    ;

    //If we're on mobile, completely disable the advanced view
    if (highed.onPhone()) {
        properties.noAdvanced = true;
    }

    body.className += ' highed-customizer-body';

    properties.availableSettings = highed.arrToObj(properties.availableSettings);

    ///////////////////////////////////////////////////////////////////////////

     /** Force a resize of the editor 
     *  @memberof highed.ChartCustomizer
     *  @param w {number} - the new width
     *  @param h {number} - the new height
     */
    function resize(w, h) {
        var bsize, lsize;
        
        tabs.resize(w, h);
        bsize = tabs.barSize();

        list.resize(w, h - bsize.h);
        splitter.resize(w, h - bsize.h - 10);

        //The customize body needs to have a min-height of the list height
        lsize = highed.dom.size(list.container);

        highed.dom.style(body, {
            minHeight: lsize.h + 'px'
        });
    }

    /** Init the customizer
     *  @memberof highed.ChartCustomizer
     *  @param foptions {object} - the customized options
     *  @param coptions {object} - the full chart options
     */
    function init(foptions, coptions) {
        flatOptions = coptions || {};
        chartOptions = coptions || flatOptions;
        list.reselect();
        buildTree();
        advTree.reselect();
    }

    function buildBody(entry) {

    }

    function applyFilter(detailIndex, filteredBy, filter) {       
        var selected = list.selected(),
            id = selected.id,
            entry = highed.meta.optionsExtended.options[id]
        ;

        if (!selected) return false;
        
        body.innerHTML = '';

        entry.forEach(function (thing) {
            selectGroup(thing, false, false, detailIndex, filteredBy, filter);
        });
        
        highlighted = false;
    }

    function shouldInclude(group) {
        var doInclude = false;

        if (Object.keys(properties.availableSettings || {}).length > 0) {
            if (highed.isArr(group)) {
                group.forEach(function (sub) {
                    if (shouldInclude(sub)) {
                        doInclude = true;
                    }
                });
            } else if (highed.isArr(group.options)) {
                group.options.forEach(function (sub) {
                    if (shouldInclude(sub)) {
                        doInclude = true;
                    }
                });
            } else if (properties.availableSettings[group.id]) {
                doInclude = true;
            } 

            return doInclude;
        }
        
        return true;
    }

    //This function has mutated into a proper mess. Needs refactoring.
    function selectGroup(group, table, options, detailIndex, filteredBy, filter) {
        var master, vals, doInclude = true, container, masterNode;

        options = options || flatOptions;

        if (highed.isArr(group.options)) {
            table = highed.dom.cr('table', 'highed-customizer-table');

            doInclude = shouldInclude(group);

            if (!doInclude) {
                return;
            }

            container = highed.dom.cr('div', 'highed-customize-group');
            masterNode = highed.dom.cr('div', 'highed-customize-master-dropdown');

            highed.dom.ap(body, 
                highed.dom.ap(container,
                    highed.dom.cr('div', 'highed-customizer-table-heading', highed.L(group.text)),
                    masterNode,
                    table
                )
            );

            if (group.filteredBy) {
                filter = highed.getAttr(options, group.filteredBy, detailIndex);
            }

            if (group.controlledBy) {
                master = highed.DropDown(); //highed.dom.cr('select', 'highed-box-size highed-stretch');

                highed.dom.style(masterNode, {
                    display: 'block'
                });
            
                if (highed.isStr(group.controlledBy.options)) {
                    vals = highed.getAttr(options, group.controlledBy.options, detailIndex);

                    if (highed.isArr(vals)) {
                        if (vals.length === 0) {
                            highed.dom.ap(body, highed.dom.cr('i', '', 'No data to display..'));
                            return;
                        }

                        master.addItems(
                            vals.map(function (t) {
                                return group.controlledBy.optionsTitle ? t[group.controlledBy.optionsTitle] : t;
                            })
                        );  

                        master.selectByIndex(detailIndex || 0);

                        master.on('Change', function (selected) {
                            detailIndex = selected.index();

                            table.innerHTML = '';

                            group.options.forEach(function (sub) {
                                if (group.filteredBy) {
                                    filter = highed.getAttr(options, group.filteredBy, detailIndex);                                    
                                }
                                selectGroup(sub, table, options, detailIndex, group.filteredBy, filter);
                            });
                        });

                        

                        highed.dom.ap(masterNode, master.container);               
                        detailIndex = detailIndex || 0;
                    } else {
                        return;
                    }
                }
            }

            //highed.dom.ap(body, table);

            group.options.forEach(function (sub) {
                selectGroup(sub, table, options, detailIndex, group.filteredBy, filter);
            });
                   
        } else if (typeof group.id !== 'undefined') {     

            //Check if we should filter out this column
            if (filter && group.subType && group.subType.length) {
                if (!highed.arrToObj(group.subType)[filter]) {
                    return;
                }
            }

            if (Object.keys(properties.availableSettings || {}).length > 0) {
                if (!properties.availableSettings[group.id]) {
                    return;
                }
            }

            if (typeof group.dataIndex !== 'undefined') {
                detailIndex = group.dataIndex;
            }

            //highed.dom.ap(sub, highed.dom.cr('span', '', referenced[0].returnType));
            highed.dom.ap(table, 
                highed.InspectorField(
                    group.values ? 'options' : (group.dataType), 
                    (highed.getAttr(options, group.id, detailIndex) || (filter && group.subTypeDefaults[filter] ? group.subTypeDefaults[filter] : group.defaults)), 
                    {
                        title: highed.L('option.text.' + group.pid),
                        tooltip: highed.L('option.tooltip.' + group.pid),
                        values: group.values,
                        custom: group.custom,
                        defaults: group.defaults,
                        attributes: group.attributes || []   
                    },
                    function (newValue) {        
                        events.emit('PropertyChange', group.id, newValue, detailIndex);
                        
                        if (group.id === filteredBy) {
                            //This is a master for the rest of the childs,
                            //which means that we need to rebuild everything 
                            //here somehow and check their subType
                            applyFilter(detailIndex, filteredBy, newValue);
                        }
                    },
                    false,
                    group.id
                )
            );
        }
    }

    function buildTree() {
        if (properties.noAdvanced || highed.isNull(highed.meta.optionsAdvanced)) {
            advancedTab.hide();
        } else {
            advTree.build(highed.meta.optionsAdvanced, chartOptions);        
        }
    }

    function build() {
        Object.keys(highed.meta.optionsExtended.options).forEach(function (key) {
            if (!shouldInclude(highed.meta.optionsExtended.options[key])) {
                return;
            }

            list.addItem({
                id: key,
                title: highed.L(key)
            });
        });

        buildTree();
    }

    //Highlight a node
    function highlightNode(n) {
         if (!n) return;

        var p = highed.dom.pos(n);

        highed.dom.style(n, {
            border: '2px solid #33aa33'
        });

        n.focus();
        n.scrollIntoView(true);

        window.setTimeout(function () {
            highed.dom.style(n, {
                border: ''
            });
        }, 2000);
    }

    /** Highlight a field in the customizer
     *  @memberof highed.ChartCustomizer
     *  @param id {string} - is the id of the field to highlight
     */
    function highlightField(id) {
        if (id.indexOf('-') >= 0) {            
            var n = advSplitter.left.querySelector('#' + id.substr(0, id.indexOf('-')));        

            highlightNode(body.querySelector('#' + id));
            highlightNode(advSplitter.right.querySelector('#' + id));

            if (n) {
                n.scrollIntoView({block: "end"});
            }
        }
    }

    /** Focus a category
     *  @memberof highed.ChartCustomizer
     *  @param thing {anything} - the category to focus
     *  @param x {number} - the x coordinate where the focus was triggered
     *  @param y {number} - the y coordinate where the focus was triggered
     */
    function focus(thing, x, y) {
        var n;

        list.select(thing.tab);
        advTree.expandTo(thing.id);
        highlightField(thing.id);        
    }

    ///////////////////////////////////////////////////////////////////////////
    
    list.on('Select', function (id){
        var entry = highed.meta.optionsExtended.options[id];
        body.innerHTML = '';
        entry.forEach(function (thing) {
            selectGroup(thing);
        });
        highlighted = false;
    });

    function buildAdvTree(item, selected, arrIndex, filter) {
        var table = highed.dom.cr('table', 'highed-customizer-table');
        advBody.innerHTML = '';

        Object.keys(item.entries).forEach(function (key) {
            var entry = item.entries[key];

            if (filter && entry.subType) {
                //Check if the sub type is valid
                if (!entry.subType[filter]) {
                    return;
                }
            }
            
            if (!entry.shortName.length) {
                return;
            }

            highed.dom.ap(table,
                highed.InspectorField(
                    entry.values ?  'options' : (entry.dataType || 'string'), 
                    (highed.getAttr(chartOptions, entry.id, arrIndex)  || entry.defaults), 
                    {
                        title: highed.uncamelize(entry.shortName),
                        tooltip: entry.description,
                        values: entry.values,
                        defaults: entry.defaults,
                        custom: {},
                        attributes: entry.attributes || []
                    },
                    function (newValue) {          
                        events.emit('PropertyChange', entry.id, newValue, arrIndex);

                        //This should not be hardcoded.
                        if (entry.id === 'series--type') {
                            //Need to reselect with a filter applied
                            buildAdvTree(item, selected, arrIndex, newValue);
                        }

                    },
                    false,
                    entry.id
                )
            );
        });

        highed.dom.ap(advBody, 
            highed.dom.ap(highed.dom.cr('div', 'highed-customize-group'),
                highed.dom.cr('div', 'highed-customizer-table-heading', selected),
                table
            )
        );
    }

    advTree.on('Select', function (item, selected, arrIndex, filter) {
        //This is a hack - we need a dynamic system for this later.
        if (item.id === 'series') {
            filter = highed.getAttr(chartOptions, 'series--type', arrIndex);
        }

        buildAdvTree(item, selected, arrIndex, filter);
    });

    advTree.on('DataUpdate', function (path, data) {
        events.emit('PropertyChange', path, data);
    });

    advTree.on('Dirty', function () {
        init(flatOptions, chartOptions);
    });

    tabs.on('Focus', function () {
        init(flatOptions, chartOptions);
    });

    build();

    return {
        /* Listen to an event */
        on: events.on,
        resize: resize,
        init: init,
        focus: focus,
        reselect: list.reselect,
        highlightField: highlightField,
        list: list
    };
};
