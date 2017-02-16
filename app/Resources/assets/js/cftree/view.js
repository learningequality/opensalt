//////////////////////////////////////////////////////
// SET UP APP OBJECT
window.app = window.app||{};
//////////////////////////////////////////////////////
// SPINNER
app.spinnerHtml = function(msg) {
    return '<div class="spinnerOuter"><span class="glyphicon glyphicon-cog spinning spinnerCog"></span><span class="spinnerText">' + msg + '</span></div>';
};

app.showModalSpinner = function(msg) {
    $("#modalSpinnerMessage").html(app.spinnerHtml(msg));
    $("#modalSpinner").show();
};

app.hideModalSpinner = function() {
    $("#modalSpinner").hide();
};

//////////////////////////////////////////////////////
// BROWSER HISTORY MAINTENANCE

// set onpopstate event to restore state when user clicks the browser back/forward button
window.onpopstate = function(event) {
    var key = event.state;
    // set popStateActivate so we don't re-push this history state
    app.popStateActivate = true;
    app.ft.fancytree("getTree").activateKey(key);
};

// Function to update the history state; called when a tree node is activated
app.pushHistoryState = function(key, path) {
    // if we just called this after the user clicked back or forward, though, don't push a new state
    if (app.popStateActivate != true) {
        window.history.pushState(key, "Competency Framework", path);
    }
    // clear popStateActivate
    app.popStateActivate = false;
};

//////////////////////////////////////////////////////
// ITEM DETAIL SUMMARIES
// Get a jquery reference to the specified item's details element
app.getLsItemDetailsJq = function(lsItemId) {
    return $(".itemInfo[data-item-lsItemId=" + lsItemId + "]");
};

// Load details for the specified item
app.loadItemDetails = function(lsItemId) {
    // clone the itemInfoTemplate
    $jq = $("#itemInfoTemplate").clone();
    $jq.removeAttr('id');

    // add lsItemId
    $jq.attr("data-item-lsItemId", lsItemId);

    // fill in the title, which we can get from the item's tree node
    var n = app.getNodeFromLsItemId(lsItemId);
    $jq.find(".itemTitle").html(app.titleFromNode(n));
    $jq.find('.itemDetails').html(app.spinnerHtml("Loading Item Details"));

    // append and show the shell details div
    $("#items").append($jq);
    $jq.show();

    // ajax call to get the full item details
    $jq.find('.itemDetails').load(
        app.path.lsItemDetails.replace('ID', lsItemId),
        null,
        function(responseText, textStatus, jqXHR) {
            // details should be loaded
            console.log("item " + lsItemId + " loaded");

            // enable hidden fields
            $jq.find(".lsItemDetailsExtras").hide();

            // enable more info link
            $jq.find(".lsItemDetailsMoreInfoLink a").on('click', function(e) { app.toggleMoreInfo(); });

            // restore last more info state
            app.toggleMoreInfo("restore");

            // enable deleteItem button
            $jq.find("[id=deleteItemBtn]").on('click', app.deleteItems);

            // enable toggleFolder button
            $jq.find("[id=toggleFolderBtn]").on('click', app.toggleFolder);
            
            // hide/enable make folder and create new item buttons appropriately
            app.toggleItemCreationButtons();

            // enable remove association button(s)
            $jq.find(".btn-remove-association").on('click', function(e) { app.deleteAssociation(e); });

            // new item button doesn't need to be enabled because it shows a dialog
        }
    );
};

// Clear item details for the specified item
app.clearItemDetails = function(lsItemId) {
    app.getLsItemDetailsJq(lsItemId).remove();
};

// Toggle more item details.
// @param {*} [arg] - if true or false, set to that value; if "restore", restore last-used value; otherwise toggle
app.moreInfoShowing = false;
app.toggleMoreInfo = function(arg) {
    if (arg == null) {
        app.moreInfoShowing = !app.moreInfoShowing;
    } else if (arg != "restore") {
        app.moreInfoShowing = arg;
    }

    if (app.moreInfoShowing) {
        $(".lsItemDetailsExtras").slideDown(100);
        $(".lsItemDetailsMoreInfoLink a").text("Less Info");
    } else {
        $(".lsItemDetailsExtras").slideUp(100);
        $(".lsItemDetailsMoreInfoLink a").text("More Info");
    }
};

//////////////////////////////////////////////////////
// TREE LOADING AND FUNCTIONALITY

app.processTree = function(tree, isTopNode) {
    // first make sure the node's title attribute is filled in and matches what will appear in the window
    tree.title = app.titleFromNode(tree);
    
    // if isTopNode is true, it's the document, which should not be selectable or have a checkbox
    if (isTopNode == true) {
        tree.hideCheckbox = true;
        tree.unselectable = true;
    }

    // if tree has any children
    if (tree.children != null && tree.children.length > 0) {
        // sort children by listEnum
        tree.children.sort(function(a,b) {
            var leA = a.listEnum * 1;
            var leB = b.listEnum * 1;
            if (isNaN(leA)) leA = 100000;
            if (isNaN(leB)) leB = 100000;
            return leA - leB;
        });

        // then order any children of each child
        for (var i = 0; i < tree.children.length; ++i) {
            app.processTree(tree.children[i]);
        }
    }
};

// Render the tree for the document we're editing
app.renderTree1 = function() {
    // first process the tree
    app.processTree(app.tree1[0], true);

    // establish the fancytree widget
    app.ft = $('#viewmode_tree').fancytree({
        extensions: ['filter', 'dnd'],
        source: app.tree1,
        quicksearch: true,
        renderTitle: function(event, data) {
            return app.titleFromNode(data.node, "ftTitleSpan");
        },
        filter:{
            autoApply: true,  // Re-apply last filter if lazy data is loaded
            counter: true,  // Show a badge with number of matching child nodes near parent icons
            fuzzy: false,  // Match single characters in order, e.g. 'fb' will match 'FooBar'
            hideExpandedCounter: true,  // Hide counter badge, when parent is expanded
            highlight: true,  // Highlight matches by wrapping inside <mark> tags
            mode: "hide"  // Grayout unmatched nodes (pass "hide" to remove unmatched node instead)
        },

        renderNode: function(event, data) {
            app.treeItemTooltip(data.node);
        },

        // when item is activated (user clicks on it or activateKey() is called), show details for the item
        activate: function(event, data) {
            app.tree1Activate(data.node);
        },
        // I don't think we really want to do this on click; that calls the tree1Activate function when you click the arrow to expand the item
        click: function(event, data) {
            //app.ft.fancytree("getTree").activateKey(data.node.key);
            //app.tree1Activate(data.node);
        },

        // if user doubleclicks on a node, open the node, then simulate clicking the "Edit" button for it
        dblclick: function(event, data) {
            console.log("dblclick");
            var lsItem = app.lsItemIdFromNode(data.node);
            setTimeout(app.treeDblClicked, 50, lsItem);

            // return false to cancel default processing (i.e. opening folders)
            return false;
        },

        // drag-and-drop functionality - https://github.com/mar10/fancytree/wiki/ExtDnd
        dnd: {
            dragExpand: function() { return false; },   // don't autoexpand folders when you drag over them; this makes things confusing

            smartRevert: true,
            // focusOnClick: true,
            // this function seems to need to be defined for the dnd functionality to work
            dragStart: function(node, data) {
                // don't allow the document to be dragged
                var lsItemId = app.lsItemIdFromNode(node);
                return lsItemId !== null;
            },

            initHelper: function(node, data) {
                // Helper was just created: modify markup
                var helper = data.ui.helper;
                var tree = node.tree;
                var sourceNodes = data.tree.getSelectedNodes();

                // Store a list of active + all selected nodes
                if (!node.isSelected()) {
                    sourceNodes.unshift(node);
                }
                helper.data("sourceNodes", sourceNodes);

                // Mark selected nodes also as drag source (active node is already)
                $(".fancytree-active,.fancytree-selected", tree.$container).addClass("fancytree-drag-source");

                // Add a counter badge to helper if dragging more than one node
                if (sourceNodes.length > 1) {
                    helper.append($("<span class='fancytree-childcounter'/>").text("+" + (sourceNodes.length - 1)));
                }
            },

            //dragStop: function(node, data){ console.log('dragStop'); },
            //updateHelper: function(){ console.log('updateHelper'); },

            dragEnter: function(droppedNode, data) {
                var draggedNode = data.otherNode;

                // determine if this is inter- or intra-tree drag
                var treeDraggedFrom = "tree1";
                if (droppedNode.tree != draggedNode.tree) {
                    treeDraggedFrom = "tree2";
                }

                // intra-tree drag
                if (treeDraggedFrom == "tree1") {
                    // Don't allow dropping *over* a non-folder node (this would make it too easy to accidentally create a child).
                    if (droppedNode.folder == true) {
                        // also don't allow dropping before or after the document -- only "over" allowed in this case
                        if (app.isDocNode(droppedNode)) {
                            return "over";
                        } else {
                            return true;
                        }
                    } else {
                        return ["before", "after"];
                    }

                    // drag from tree2 to tree1
                } else {
                    // if we're in associate mode, only allow drags *over*, not between, items
                    if (app.tree2Mode == "addAssociation") {
                        // and don't allow any drops onto the document
                        if (app.lsItemIdFromNode(droppedNode) == null) {
                            return false;
                        } else {
                            return 'over';
                        }
                        // else we're in copy mode; use same thing here as moving within the tree
                    } else {
                        // don't allow dropping before or after the document -- only "over" allowed in this case
                        if (app.isDocNode(droppedNode)) {
                            return "over";
                        } else if (droppedNode.folder == true) {
                            return true;
                        } else {
                            return ["before", "after"];
                        }
                    }
                }
            },

            dragDrop: function(droppedNode, data){
                // USE SOURCENODES INSTEAD OF THIS
                // var draggedNode = data.otherNode;

                /*
                var draggedItemId = app.lsItemIdFromNode(draggedNode);
                var droppedItemId = app.lsItemIdFromNode(droppedNode);
                var hitMode = data.hitMode;
                console.log('tree1 dragDrop from ' + treeDraggedFrom + ' (tree2Mode: ' + app.tree2Mode + '): ' + draggedItemId + ' to ' + hitMode + ' ' + droppedItemId);
                */

                // determine if this is inter- or intra-tree drag
                var treeDraggedFrom = "tree1";
                if (droppedNode.tree != data.otherNode.tree) {
                    treeDraggedFrom = "tree2";
                }
                
                var sourceNodes = data.ui.helper.data("sourceNodes");

                for (var i = 0; i < sourceNodes.length; ++i) {
                    var draggedNode = sourceNodes[i];

                    // intra-tree drag
                    if (treeDraggedFrom === "tree1") {
                        // move the item in the tree
                        app.reorderItems(draggedNode, droppedNode, data.hitMode);

                    // inter-tree drag (from tree2)
                    } else {
                        // if we're in associate mode, show choice for what type of association to add
                        if (app.tree2Mode === "addAssociation") {
                            app.createAssociation(sourceNodes, droppedNode);
                            // in this case we just want to do it once, so break out of the loop
                            break;

                            // else if we're in copy mode; copy node to new tree
                        } else if (app.tree2Mode === "copyItem") {
                            app.copyItem(draggedNode, droppedNode, data.hitMode);
                        }
                    }
                }
            }
        }

        // we don't currently need the below functions
        // beforeSelect: function(event, data){console.log(event, data);},
        // select: function(event, data){console.log(event, data);},

        // debugLevel:2
    });
};

app.initializeControls = function() {
    // right-side buttongroup
    $("#rightSideItemDetailsBtn").on('click', function() { app.tree2Toggle(false); });
    $("#rightSideCopyItemsBtn").on('click', function() { app.copyItemInitiate(); });
    $("#rightSideCreateAssociationsBtn").on('click', function() { app.addAssociation(); });

    // Tree checkboxes
    $(".treeCheckboxControlBtn").on('click', function(e) { app.treeCheckboxToggleAll($(this)); e.stopPropagation(); });
    $(".treeCheckboxMenuItem").on('click', function() { app.treeCheckboxMenuItemSelected($(this)); });
    
    // tree2 change tree button
    $("#changeTree2DocumentBtn").on('click', function() { app.changeTree2() });
    
    // Prepare filters
    app.filterOnTrees();
};

app.getTreeFromInput = function($jq) {
    return $("#" + $jq.closest(".treeSide").find(".treeDiv").attr("id"));
};

app.treeCheckboxToggleCheckboxes = function($tree, val) {
    var $cb = $tree.closest(".treeSide").find(".treeCheckboxControl");
    if (val == true) {
        $tree.fancytree("getTree").rootNode.hideCheckbox = true;
        $tree.fancytree("option", "checkbox", true);
        $tree.fancytree("option", "selectMode", 2);

        // show the menu
        $cb.closest(".input-group").find(".dropdown-toggle").show();
        
        // mark the cb as enabled
        $cb.data("checkboxesEnabled", "true");
        
        // reset cb to off
        $cb.prop("checked", false);

    } else {
        $tree.fancytree("option", "checkbox", false);
        $tree.fancytree("option", "selectMode", 1);

        // hide the menu
        $cb.closest(".input-group").find(".dropdown-toggle").hide();
        
        // mark the cb as not enabled
        $cb.data("checkboxesEnabled", "false");
        
        // reset cb to off
        $cb.prop("checked", false);
    }
}

app.treeCheckboxToggleAll = function($input, val) {
    var $tree = app.getTreeFromInput($input);
    var $cb = $tree.closest(".treeSide").find(".treeCheckboxControl");

    // if this is the first click for this tree, enable checkboxes on the tree
    if ($cb.data("checkboxesEnabled") != "true") {
        app.treeCheckboxToggleCheckboxes($tree, true);
    
    // else toggle select all
    } else {
        if (val === undefined) val = $cb.is(":checked");
        
        // determine if something is entered in the search bar
        var searchEntered = false;
        var $filter = $tree.closest("section").find(".treeFilter");
        if ($filter.length > 0) {
            searchEntered = ($filter.val() != "");
        }
        
        $tree.fancytree("getTree").visit(function(node) {
            if (node.unselectable != true) {
                // if either (we're not filtering) or (the node matches the filter) or (val is false),
                if (searchEntered == false || node.match == true || val == false) {
                    // set selected to val
                    node.setSelected(val);
                }
            }
        });
    }
};

app.treeCheckboxMenuItemSelected = function($menu) {
    var $tree = app.getTreeFromInput($menu);

    // get all selected items
    var itemIds = [];
    $tree.fancytree("getTree").visit(function(node) {
        if (node.selected == true && node.unselectable != true) {
            itemIds.push(node.key);
        }
    });
    
    var cmd = $menu.attr("data-cmd");
    if (cmd != "hideCheckboxes" && itemIds.length == 0) {
        alert("Select one or more items using the checkboxes before choosing a menu item.");
        return;
    }
    
    if (cmd == "edit") {
        alert("The ability to edit properties of multiple items at the same time will be coming soon.");
    } else if (cmd == "delete") {
        app.deleteItems(itemIds);
    } else {    // hideCheckboxes
        // clear checkbox selections
        var $cb = $tree.closest(".treeSide").find(".treeCheckboxControl");
        app.treeCheckboxToggleAll($cb, false);
        app.treeCheckboxToggleCheckboxes($tree, false);
    }
};

// The user first clicks a button to copy an item or add an association, then selected a document from the dropdown list
app.tree2Selected = function() {
    // get the selected document id
    var lsDoc2Id = $("#ls_doc_list_lsDoc").val();

    // if user selects the blank item in the menu, go back to the currently-loaded document
    if (lsDoc2Id == "") {
        $("#ls_doc_list_lsDoc").val(app.lsDoc2Id);
        return;
    }

    // destroy previus ft2 if there
    if (app.ft2 != null) {
        app.ft2.fancytree("destroy");
    }
    $('#viewmode_tree2').html(app.spinnerHtml("Loading Document"));

    // ajax call to load the document json
    $.ajax({
        url: app.path.doctree_render_document.replace('ID', lsDoc2Id),
        method: 'GET'
    }).done(function(data, textStatus, jqXHR) {
        // on success, set lsDoc2Id and tree2, then call renderTree2
        app.lsDoc2Id = lsDoc2Id;
        app.tree2 = data;
        app.renderTree2();
        
        // also show instructions properly by re-calling copyItemInitiate or addAssociation
        if ($("#rightSideCopyItemsBtn").hasClass("btn-primary")) {
            app.copyItemInitiate();
        } else {
            app.addAssociation();
        }
        
        // and hide tree2SelectorDiv
        $("#tree2SelectorDiv").hide();

    }).fail(function(jqXHR, textStatus, errorThrown){
        $('#viewmode_tree2').html("ERROR:" + jqXHR.responseText);
        $('#ls_doc_list_lsDoc').val("");
    });
};

app.changeTree2 = function() {
    // clear viewmode_tree2 and hide tree2SectionControls
    $("#viewmode_tree2").html("");
    $("#tree2SectionControls").hide();
    
    // clear selection in ls_doc_list_lsDoc
    $("#ls_doc_list_lsDoc").val("");
    
    // and show tree2SelectorDiv
    $("#tree2SelectorDiv").show();
};

// Render tree2 to copy items or create associations
app.renderTree2 = function() {
    // first process the tree
    app.processTree(app.tree2[0]);
    
    // clear and hide viewmode_tree2
    $('#viewmode_tree2').html("").show();

    app.ft2 = $('#viewmode_tree2').fancytree({
        extensions: ['filter', 'dnd'],
        source: app.tree2,

        renderTitle: function(event, data){
            return app.titleFromNode(data.node, "ftTitleSpan");
        },
        quicksearch: true,
        filter:{
            autoApply: true,  // Re-apply last filter if lazy data is loaded
            counter: true,  // Show a badge with number of matching child nodes near parent icons
            fuzzy: false,  // Match single characters in order, e.g. 'fb' will match 'FooBar'
            hideExpandedCounter: true,  // Hide counter badge, when parent is expanded
            highlight: true,  // Highlight matches by wrapping inside <mark> tags
            mode: "hide"  // Grayout unmatched nodes (pass "hide" to remove unmatched node instead)
        },

        renderNode: function(event, data) {
            app.treeItemTooltip(data.node);
        },

        // drag-and-drop functionality - https://github.com/mar10/fancytree/wiki/ExtDnd
        dnd: {
            // focusOnClick: true,
            dragExpand: function() { return false; },   // don't autoexpand folders when you drag over them; this makes things confusing
            
            // modify default jQuery draggable options
            draggable: {
                // disable auto-scrolling, though I'm not sure this does much good
                scroll: false,
                // append the draggable helper item to the body, so that you'll see it when you drag over tree2
                appendTo: "body"
            },

            // define dragStart on tree2 to allow dragging from this tree
            dragStart: function(node, data) {
                // when we start dragging, activate the key so it'll be highlighted
                app.ft2.fancytree("getTree").activateKey(node.key);

                // also show its tooltip
                $(node.span).find(".fancytree-title").data('bs.tooltip').options.trigger = 'manual';
                $(node.span).find(".fancytree-title").tooltip('show');

                // don't allow the document to be dragged
                var lsItemId = app.lsItemIdFromNode(node);
                return lsItemId !== null;
            },

            initHelper: function(node, data) {
                // Helper was just created: modify markup
                var helper = data.ui.helper;
                var tree = node.tree;
                var sourceNodes = data.tree.getSelectedNodes();

                // Store a list of active + all selected nodes
                if (!node.isSelected()) {
                    sourceNodes.unshift(node);
                }
                helper.data("sourceNodes", sourceNodes);
                
                console.log(helper.html());

                // Mark selected nodes also as drag source (active node is already)
                $(".fancytree-active,.fancytree-selected", tree.$container).addClass("fancytree-drag-source");

                // Add a counter badge to helper if dragging more than one node
                if (sourceNodes.length > 1) {
                    helper.append($("<span class='fancytree-childcounter'/>").text("+" + (sourceNodes.length - 1)));
                }
            },

            dragStop: function(node, data) {
                // reset trigger on node's tooltip
                $(node.span).find(".fancytree-title").tooltip('hide');
                $(node.span).find(".fancytree-title").data('bs.tooltip').options.trigger = 'hover focus';
            },

            // this function needs to be defined for the dnd functionality to work...
            dragEnter: function(node, data) {
                // but you can't drag from tree2 to tree2, so return false here to prevent this
                // the logic for dragging into tree1 is in the other fancytree definer
                return false;
            },
            dragDrop: function(node, data){
                // we should never get here, because we only allow drags from tree2 to tree1
                console.log('tree2 dragDrop (' + app.tree2Mode + '): ' + draggedItemId + ' to ' + hitMode + ' ' + droppedItemId);
            }
        }
    });
};

// Toggle visibility of tree2 / the item details section
app.tree2Showing = false;
app.tree2Toggle = function(showTree2) {
    if (showTree2 === true || showTree2 === false) {
        app.tree2Showing = showTree2;
    } else {
        app.tree2Showing = !app.tree2Showing;
    }

    if (app.tree2Showing) {
        if (app.ft2 != null) {
            $("#tree2SectionControls").show();
        }
        $("#tree2Section").show();
        $("#itemSection").hide();
        // caller should also set app.tree2Mode

    } else {
        $("#tree2SectionControls").hide();
        $("#tree2Section").hide();
        $("#itemSection").show();

        // if we're hiding tree2, set app.tree2Mode to none
        app.tree2Mode = "none";
        
        // also change rightSideItemDetailsBtn to primary and other two rightSide buttons to default
        $("#rightSideItemDetailsBtn").addClass("btn-primary").removeClass("btn-default");
        $("#rightSideCopyItemsBtn").removeClass("btn-primary").addClass("btn-default");
        $("#rightSideCreateAssociationsBtn").removeClass("btn-primary").addClass("btn-default");
    }
};

// Determine if a node is the main document node
app.isDocNode = function(n) {
    return (n.parent == null || n.parent.parent == null);
};

// Given an lsItemId, return the corresponding ft node
app.getNodeFromLsItemId = function(lsItemId, tree) {
    if (tree == "tree2") app.ft2;
    else tree = app.ft;

    if (lsItemId == null) {
        return tree.fancytree("getTree").getNodeByKey("doc-" + app.lsDocId);
    } else {
        return tree.fancytree("getTree").getNodeByKey(lsItemId+"");
    }
};

// Given a node, return the lsItemId as derived from the key -- or null if it's the doc node
app.lsItemIdFromNode = function(n) {
    if (typeof(n) != "object" || app.isDocNode(n)) {
        return null;
    } else {
        return n.key;
    }
};

// Given a node, return the title html we want to show for the node
app.titleFromNode = function(node, format) {
    var data;
    if (node.data != null) data = node.data;
    else data = node;

    var title;
    // document -- for some reason the title is in node and other data is in node.data
    if (node.title != null) {
        title = node.title;
    } else {
        if (data.abbrStmt != null && data.abbrStmt != "") {
            title = data.abbrStmt;
        } else {
            title = data.fullStmt;
        }
        // if we have a humanCoding for the node, show it first in bold
        if (data.humanCoding != null && data.humanCoding != "") {
            title = '<span class="item-humanCodingScheme">' + data.humanCoding + '</span> ' + title;
        }
    }
    // if format is "ftTitleSpan", return wrapped in the fancytree-title span
    if (format === "ftTitleSpan") {
        return '<span class="fancytree-title">' + title + '</span>';
        // if format is "textOnly", extract a text only version
    } else if (format === "textOnly") {
        return $('<div>' + title + '</div>').text();

        // otherwise return as is
    } else {
        return title;
    }
};

// Initialize a tooltip for a tree item
app.treeItemTooltip = function(node) {
    var $jq = $(node.span);
    
    var content;
    if (app.isDocNode(node)) {
        content = "Document: " + node.title;
    } else {
        content = node.data.fullStmt;
        if (node.data.humanCoding !== null) {
            content = '<span class="item-humanCodingScheme">' + node.data.humanCoding + '</span> ' + content;
        }
    }

    // Note: we need to make the tooltip appear on the title, not the whole node, so that we can have it persist
    // when you drag from tree2 into tree1
    $jq.find(".fancytree-title").tooltip({
        // "content": content,  // this is for popover
        "title": content,   // this is for tooltip
        "delay": { "show": 500, "hide": 100 },
        "placement": "bottom",
        "html": true,
        "container": "body"
        // "trigger": "hover"   // this is for popover
    });
};

// Show an item (usually called when user clicks the item in tree1)
app.tree1Activate = function(n) {
    // hide tree2 and show the item details section
    app.tree2Toggle(false);

    var lsItemId = app.lsItemIdFromNode(n);

    // if this item is already showing, return now (after making sure the item details, rather than tree2, is showing)
    if (lsItemId == app.lsItemId) return;

    // replace app.lsItemId
    app.lsItemId = lsItemId;

    // if this is the lsDoc node
    if (app.lsItemId == null) {
        // replace url
        app.pushHistoryState(app.lsItemId, app.path.lsDoc.replace('ID', app.lsDocId));

        // show documentInfo and hide all itemInfos
        $(".itemInfo").hide();
        $("#documentInfo").show();

        // set appropriate class on itemSection
        $("#itemSection").removeClass("lsItemItemSection").addClass("docStatus-{{ lsDoc.adoptionStatus|default('Draft') }}");

        // else it's an lsItem
    } else {
        // replace url
        app.pushHistoryState(app.lsItemId, app.path.lsItem.replace('ID', app.lsItemId));

        // hide documentInfo and all itemInfos
        $(".itemInfo").hide();
        $("#documentInfo").hide();

        // set appropriate class on itemSection
        $("#itemSection").removeClass("docStatus-{{ lsDoc.adoptionStatus|default('Draft') }}").addClass("lsItemItemSection");

        // if we already have an item div loaded for this item, just show it
        if (app.getLsItemDetailsJq(app.lsItemId).length > 0) {
            app.getLsItemDetailsJq(app.lsItemId).show();

            // else...
        } else {
            // construct and show it
            app.loadItemDetails(app.lsItemId);
        }
    }
};

//////////////////////////////////////////////////////
// REORDER ITEMS IN TREE1

// Called after the user has dragged-and-dropped an item
app.reorderItems = function(draggedNode, droppedNode, hitMode) {
    // note original parent
    var originalParent = draggedNode.parent;

    // move the item in the tree
    draggedNode.moveTo(droppedNode, hitMode);

    // make sure droppedNode is expanded
    droppedNode.setExpanded(true);
    droppedNode.render();
    
    // now saveItemOrder
    app.saveItemOrder(draggedNode, originalParent);
};

app.saveItemOrder = function(node, originalParent) {
    // update the listEnum fields for the node's (possibly new) parent's children
    // (the former parent's children will still be in order, though we might want to "clean up" those listEnums too)
    var siblings = node.parent.children;
    var lsItems = {};
    for (var i = 0; i < siblings.length; ++i) {
        var key = siblings[i].key;

        // update listEnum if changed
        if (key.lastIndexOf('__', 0) !== 0 && (siblings[i].data == null || siblings[i].data.listEnum != (i+1))) {
            lsItems[key] = {
                "listEnumInSource": (i + 1)
            };

            // update field value in display
            app.getLsItemDetailsJq(key).find("[data-field-name=listEnumInSource]").text(i + 1);
        }

        // if we got to the node...
        if (key == node.key) {
            // ...then if the parent changed...
            if (node.parent != originalParent) {
                // we have to update the parent of the dragged node.

                if (lsItems[key] == null) lsItems[key] = {};

                // if parent is the document...
                if (node.parent.key.search(/^doc-(.+)/) > -1) {
                    // note the docId, and the fact that it's a document
                    lsItems[key].parentId = RegExp.$1;
                    lsItems[key].parentType = "doc";
                    // otherwise the parent is an item
                } else {
                    lsItems[key].parentId = node.parent.key;
                    lsItems[key].parentType = "item";
                }

                // also, in this case we should update listEnum's for the original parent, since we took the node out
                if (originalParent.children != null && originalParent.children.length > 0) {
                    for (var j = 0; j < originalParent.children.length; ++j) {
                        if (originalParent.children[j].data == null || originalParent.children[j].data.listEnum != (j+1)) {
                            var key = originalParent.children[j].key;
                            lsItems[key] = {
                                "listEnumInSource": (j+1)
                            };
                            // update field value in display
                            app.getLsItemDetailsJq(key).find("[data-field-name=listEnumInSource]").text(j+1);
                        }
                    }
                }
            }
        }
    }

    // ajax call to submit changes
    app.showModalSpinner("Reordering Item(s)");
    $.ajax({
        url: app.path.doctree_update_items.replace('ID', app.lsDocId),
        method: 'POST',
        data: {"lsItems": lsItems}
    }).done(function(data, textStatus, jqXHR){
        app.hideModalSpinner();
    }).fail(function(jqXHR, textStatus, errorThrown){
        app.hideModalSpinner();
        alert("An error occurred.");
    });
};


//////////////////////////////////////////////////////
// COPY AN ITEM FROM TREE2 TO TREE1

// Initiate copying items from tree 2 to tree 1
app.copyItemInitiate = function() {
    app.tree2Toggle(true);
    app.tree2Mode = "copyItem";

    // if an lsItem is active, make sure it's a folder, and open it
    /*
    if (app.lsItemId != null) {
        var node = app.getNodeFromLsItemId(app.lsItemId);
        node.folder = true;
        node.setExpanded(true);
        node.render();
    }
    */

    if (app.ft2) {
        $("#tree2InitialInstructions").hide();
        $("#tree2SectionCopyInstructions").show();
        $("#tree2SectionRelationshipInstructions").hide();
    }

    // also set rightSide buttons appropriately
    $("#rightSideItemDetailsBtn").removeClass("btn-primary").addClass("btn-default");
    $("#rightSideCopyItemsBtn").addClass("btn-primary").removeClass("btn-default");
    $("#rightSideCreateAssociationsBtn").removeClass("btn-primary").addClass("btn-default");
};

app.copyItem = function(draggedNode, droppedNode, hitMode) {
    var copiedLsItemId = app.lsItemIdFromNode(draggedNode);

    draggedNode.copyTo(droppedNode, hitMode, function(n) {
        // temporarily set key to "copiedItem"
        n.key = "copiedItem";
    });

    // now, after a few milliseconds to let the copyTo complete...
    setTimeout(function() {
        // make sure droppedNode is expanded
        droppedNode.setExpanded(true);
        droppedNode.render();

        // construct ajax call to insert the new item and reorder its siblings
        var newNode = app.getNodeFromLsItemId("copiedItem");
        var siblings = newNode.parent.children;
        var lsItems = {};
        for (var i = 0; i < siblings.length; ++i) {
            var key = siblings[i].key;

            // update listEnum if changed
            if (siblings[i].data == null || siblings[i].data.listEnum != (i+1)) {
                lsItems[key] = {
                    "listEnumInSource": (i+1)
                };
                // update field value in display
                app.getLsItemDetailsJq(key).find("[data-field-name=listEnumInSource]").text(i+1);
            }

            // if we got to the new node...
            if (key == newNode.key) {
                if (lsItems[key] == null) lsItems[key] = {};

                // set copyFromId flag so that updateItemAction will copy the item
                lsItems[key].copyFromId = copiedLsItemId;

                // set parentId and parentType
                // if parent is the document...
                if (newNode.parent.key.search(/^doc-(.+)/) > -1) {
                    // note the docId, and the fact that it's a document
                    lsItems[key].parentId = RegExp.$1;
                    lsItems[key].parentType = "doc";
                    // otherwise the parent is an item
                } else {
                    lsItems[key].parentId = newNode.parent.key;
                    lsItems[key].parentType = "item";
                }
            }
        }

        // ajax call to submit changes
        app.showModalSpinner("Copying Item(s)");
        $.ajax({
            url: app.path.doctree_update_items.replace('ID', app.lsDocId),
            method: 'POST',
            data: {"lsItems": lsItems}
        }).done(function(data, textStatus, jqXHR){
            // hide spinner
            app.hideModalSpinner();

            // returned data will be a tree with the items            
            // update keys in newNode and descendants
            var fixTree = function(node, o) {
                node.key = o.itemId+"";
                if (o.children != null && node.children != null) {
                    for (var i = 0; i < o.children.length; ++i) {
                        if (node.children[i] != null) {
                            fixTree(node.children[i], o.children[i]);
                        }
                    }
                }
            }
            fixTree(newNode, data[copiedLsItemId]);

            // re-render
            newNode.render();

        }).fail(function(jqXHR, textStatus, errorThrown){
            app.hideModalSpinner();
            alert("An error occurred.");
            console.log(jqXHR, textStatus, errorThrown);
        });
    }, 50);    // end of anonymous setTimeout function
};

//////////////////////////////////////////////////////
// EDIT THE DOCUMENT OR AN ITEM

// when user double-clicks an item, wait until the item is showing on the left, then click the edit button
app.treeDblClicked = function(lsItemId) {
    // for doc, the edit button is there on page load
    if (lsItemId == null) {
        $(".btn[data-target='#editDocModal']").click();

        // for items, we can't click the button until the item details have been loaded...
    } else {
        var $btn = app.getLsItemDetailsJq(lsItemId).find(".btn[data-target='#editItemModal']");
        // so if the button is there, click it
        if ($btn.length > 0) {
            $btn.click();
            // otherwise wait 200 ms and try again
        } else {
            setTimeout(app.treeDblClicked, 200, lsItemId);
        }
    }
};

//////////////////////////////////////////////////////
// ADD A NEW CHILD TO A DOCUMENT OR ITEM
app.toggleItemCreationButtons = function() {
    var $jq = $("[data-item-lsItemId=" + app.lsItemId + "]");
    var node = app.getNodeFromLsItemId(app.lsItemId);
    // if item already has children
    if ($.isArray(node.children)) {
        // hide "Make this item a folder" button
        $jq.find("[id=toggleFolderBtn]").hide();
        // and show the "Add a new child item" button
        $jq.find("[id=addChildBtn]").show();
    
    // else item doesn't have children
    } else {
        // show "Make this item a folder" button
        $jq.find("[id=toggleFolderBtn]").show();
        // and hide the "Add a new child item" button
        $jq.find("[id=addChildBtn]").hide();
        
        // set the text of the toggleFolderBtn appropriately
        $jq.find("[id=toggleFolderBtn]").text( (node.folder == true) ? "Make This Item a Singleton" : "Make This Item a Folder" );
    }
}

app.toggleFolder = function() {
    var node = app.getNodeFromLsItemId(app.lsItemId);
    node.folder = !(node.folder == true);
    node.render();
    app.toggleItemCreationButtons();
};

app.getAddNewChildPath = function() {
    // if we don't have an lsItemId, we're showing/editing the doc
    if (app.lsItemId == null) {
        return app.path.lsitem_new.replace('DOC', app.lsDocId);

        // else we're showing/editing an item
    } else {
        return app.path.lsitem_new.replace('DOC', app.lsDocId).replace('PARENT', app.lsItemId);
    }
};

app.prepareAddNewChildModal = function() {
    var $addNewChildModal = $('#addNewChildModal');
    $addNewChildModal.find('.modal-body').html(app.spinnerHtml("Loading Form"));
    $addNewChildModal.on('shown.bs.modal', function(e){
        $('#addNewChildModal').find('.modal-body').load(
            app.getAddNewChildPath(),
            null,
            function(responseText, textStatus, jqXHR){
                $('#ls_item_educationalAlignment').multiselect({
                    optionLabel: function(element) {
                        return $(element).html() + ' - ' + $(element).data('title');
                    },
                    numberDisplayed: 20
                });
                $('#ls_item_itemType').select2entity({dropdownParent: $('#addNewChildModal')});
            }
        )
    }).on('hidden.bs.modal', function(e){
        $('#addNewChildModal').find('.modal-body').html(app.spinnerHtml("Loading Form"));
    });
    $addNewChildModal.find('.btn-save').on('click', function(e) {
        app.showModalSpinner("Creating Item");
        $.ajax({
            url: app.getAddNewChildPath(),
            method: 'POST',
            data: $addNewChildModal.find('form[name=ls_item]').serialize()
        }).done(function(data, textStatus, jqXHR) {
            app.hideModalSpinner();
            // on successful add, add the item to the tree
            // returned data will be the path for the new item, which gives us the id
            var newChildData = {
                "key": data.replace(/.*\/(.*)$/, "$1"),
                "fullStmt": $("#ls_item_fullStatement").val(),
                "humanCoding": $("#ls_item_humanCodingScheme").val(),
                "abbrStmt": $("#ls_item_abbreviatedStatement").val(),
            };

            $addNewChildModal.modal('hide');

            app.addNewChild(newChildData);

        }).fail(function(jqXHR, textStatus, errorThrown){
            app.hideModalSpinner();
            $addNewChildModal.find('.modal-body').html(jqXHR.responseText);
            $('#ls_item_educationalAlignment').multiselect({
                optionLabel: function(element) {
                    return $(element).html() + ' - ' + $(element).data('title');
                },
                numberDisplayed: 20
            });
            $('#ls_item_itemType').select2entity({dropdownParent: $('#addNewChildModal')});
        });
    });
};

// Add new child item to tree1
app.addNewChild = function(data) {
    // construct the title
    data.title = app.titleFromNode(data);

    // get the parentNode (current item) and add the child to the parent
    var parentNode = app.getNodeFromLsItemId(app.lsItemId);
    parentNode.addChildren([data]);

    if (!parentNode.folder) {
        parentNode.folder = true;
        parentNode.setExpanded(true);
        parentNode.render();
    }

    // enable the tooltip on the new child
    var newNode = app.getNodeFromLsItemId(data.key);
    app.treeItemTooltip(newNode);

    // and now we have to saveItemOrder
    app.saveItemOrder(newNode, parentNode);
};

//////////////////////////////////////////////////////
// EDIT THE DOCUMENT OR AN ITEM

app.prepareEditDocModal = function() {
    var $editDocModal = $('#editDocModal');
    $editDocModal.find('.modal-body').html(app.spinnerHtml("Loading Form"));
    $editDocModal.on('shown.bs.modal', function(e){
        $('#editDocModal').find('.modal-body').load(
            app.path.lsdoc_edit.replace('ID', app.lsDocId),
            null,
            function(responseText, textStatus, jqXHR){
                $('#ls_doc_subjects').select2entity({dropdownParent: $('#editDocModal')});
            }
        )
    }).on('hidden.bs.modal', function(e){
        $('#editDocModal').find('.modal-body').html(app.spinnerHtml("Loading Form"));
    });
    $editDocModal.find('.btn-save').on('click', function(e){
        app.showModalSpinner("Updating Document");
        $.ajax({
            url: app.path.lsdoc_edit.replace('ID', app.lsDocId),
            method: 'POST',
            data: $editDocModal.find('form[name=ls_doc]').serialize()
        }).done(function(data, textStatus, jqXHR){
            $editDocModal.modal('hide');
            // on successful update, reload the doc; too hard to dynamically update everything here.
            window.location.reload();
            /*
               var updatedData = {
               "title": $("#ls_doc_title").val(),
               "version": $("#ls_doc_version").val(),
               "adoptionStatus": $("#ls_doc_adoptionStatus").val(),
               };
               */

        }).fail(function(jqXHR, textStatus, errorThrown){
            $editDocModal.find('.modal-body').html(jqXHR.responseText);
            $('#ls_doc_subjects').select2entity({dropdownParent: $('#editDocModal')});
        });
    });
};

app.prepareEditItemModal = function() {
    var $editItemModal = $('#editItemModal');
    $editItemModal.find('.modal-body').html(app.spinnerHtml("Loading Form"));
    $editItemModal.on('shown.bs.modal', function(e){
        $('#editItemModal').find('.modal-body').load(
            app.path.lsitem_edit.replace('ID', app.lsItemId),
            null,
            function(responseText, textStatus, jqXHR) {
                $('#ls_item_educationalAlignment').multiselect({
                    optionLabel: function(element) {
                        return $(element).html() + ' - ' + $(element).data('title');
                    },
                    numberDisplayed: 20
                });
                $('#ls_item_itemType').select2entity({dropdownParent: $('#editItemModal')});
            }
        )
    }).on('hidden.bs.modal', function(e){
        $('#editItemModal').find('.modal-body').html(app.spinnerHtml("Loading Form"));
    });
    $editItemModal.find('.btn-save').on('click', function(e){
        app.showModalSpinner("Updating Item");
        $.ajax({
            url: app.path.lsitem_edit.replace('ID', app.lsItemId),
            method: 'POST',
            data: $editItemModal.find('form[name=ls_item]').serialize()
        }).done(function(data, textStatus, jqXHR){
            app.hideModalSpinner();
            // on successful add, update the item to the tree
            var updatedData = {
                "fullStmt": $("#ls_item_fullStatement").val(),
                "humanCoding": $("#ls_item_humanCodingScheme").val(),
                "abbrStmt": $("#ls_item_abbreviatedStatement").val(),
            };
            $editItemModal.modal('hide');
            app.updateEditedItem(updatedData);

        }).fail(function(jqXHR, textStatus, errorThrown){
            app.hideModalSpinner();
            $editItemModal.find('.modal-body').html(jqXHR.responseText);
            $('#ls_item_educationalAlignment').multiselect({
                optionLabel: function(element) {
                    return $(element).html() + ' - ' + $(element).data('title');
                },
                numberDisplayed: 20
            });
            $('#ls_item_itemType').select2entity({dropdownParent: $('#editItemModal')});
        });
    });
};

app.updateEditedItem = function(data) {
    var node = app.getNodeFromLsItemId(app.lsItemId);

    // update node.data and set title
    node.data.fullStmt = data.fullStmt;
    node.data.humanCoding = data.humanCoding;
    node.data.abbrStmt = data.abbrStmt;
    node.setTitle(app.titleFromNode(data));

    // update tree tooltip
    app.treeItemTooltip(node);

    // clear details and reload
    app.clearItemDetails(app.lsItemId);
    app.loadItemDetails(app.lsItemId);
};

//////////////////////////////////////////////////////
// CREATE/DELETE ASSOCIATIONS BETWEEN ITEMS

// Prepare the modal dialog used to select the type of relationship to be formed
app.prepareAssociateModal = function() {
    var $associateModal = $('#associateModal');
    $associateModal.find('.modal-body').html(app.spinnerHtml("Loading Form"));
    $associateModal.on('shown.bs.modal', function(e){
        // we need a path using the first draggedNode
        var path = app.path.lsassociation_tree_new;
        path = path.replace('ORIGIN_ID', app.lsItemIdFromNode(app.createAssociationNodes.droppedNode));
        path = path.replace('DESTINATION_ID', app.lsItemIdFromNode(app.createAssociationNodes.draggedNodes[0]));

        $('#associateModal').find('.modal-body').load(
            path,
            null,
            // Call app.createAssociationModalLoaded when modal is loaded
            function(responseText, textStatus, jqXHR){ app.createAssociationModalLoaded() }
        )
    }).on('hidden.bs.modal', function(e){
        $('#associateModal').find('.modal-body').html(app.spinnerHtml("Loading Form"));
    });
    $associateModal.find('.btn-save').on('click', function(e){ app.createAssociationRun(); });
};

// initiate adding an association from tree2 to tree1
app.addAssociation = function() {
    app.tree2Toggle(true);
    app.tree2Mode = "addAssociation";

    if (app.tree2Showing) {
        $("#tree2InitialInstructions").hide();
        $("#tree2SectionCopyInstructions").hide();
        $("#tree2SectionRelationshipInstructions").show();
    }

    // also change rightSideItemDetailsBtn to primary and other two rightSide buttons to default
    $("#rightSideItemDetailsBtn").removeClass("btn-primary").addClass("btn-default");
    $("#rightSideCopyItemsBtn").removeClass("btn-primary").addClass("btn-default");
    $("#rightSideCreateAssociationsBtn").addClass("btn-primary").removeClass("btn-default");
};

// called when user drags and drops an item from tree2 to tree1 to create an association
app.createAssociation = function(draggedNodes, droppedNode) {
    // remember dragged and dropped nodes while we make the call to open the form
    app.createAssociationNodes = {
        "draggedNodes": draggedNodes,
        "droppedNode": droppedNode
    };

    // then open the modal form
    $('#associateModal').modal();
};

// callback after ajax to load associate form
app.createAssociationModalLoaded = function() {
    console.log("createAssociationModalLoaded");
    // show origin and destination
    var destination = app.titleFromNode(app.createAssociationNodes.draggedNodes[0]);
    if (app.createAssociationNodes.draggedNodes.length > 1) {
        destination += " <b>+" + (app.createAssociationNodes.draggedNodes.length-1) + " additional item(s)</b>";
    }
    var origin = app.titleFromNode(app.createAssociationNodes.droppedNode);
    $("#lsAssociationDestinationDisplay").html(destination);
    $("#lsAssociationOriginDisplay").html(origin);
};

app.createAssociationRun = function() {
    var $associateModal = $('#associateModal');
    var ajaxData = $associateModal.find('form[name=ls_association_tree]').serialize();

    app.showModalSpinner("Saving Association(s)");
    
    // go through all the draggedNodes
    var completed = 0;
    for (var i = 0; i < app.createAssociationNodes.draggedNodes.length; ++i) {
        // construct path for this association
        var path = app.path.lsassociation_tree_new;
        // the "origin" refers to the node that's 'receiving' the association -- so this is the droppedNode
        // the "destination" refers to the node that's being associated with the origin node -- so this is the draggedNode
        path = path.replace('ORIGIN_ID', app.lsItemIdFromNode(app.createAssociationNodes.droppedNode));
        path = path.replace('DESTINATION_ID', app.lsItemIdFromNode(app.createAssociationNodes.draggedNodes[i]));

        $.ajax({
            url: path,
            method: 'POST',
            data: ajaxData
        }).done(function(data, textStatus, jqXHR) {
            // increment completed counter
            ++completed;
            
            // if all are completed, finish up
            if (completed == app.createAssociationNodes.draggedNodes.length) {
                app.hideModalSpinner();
                $associateModal.modal('hide');

                // clear and reload item details for droppedNode
                var lsItemId = app.lsItemIdFromNode(app.createAssociationNodes.droppedNode);
                app.clearItemDetails(lsItemId);
                app.loadItemDetails(lsItemId);

                // clear createAssociationNodes
                app.createAssociationNodes = null;
            }
            
        }).fail(function(jqXHR, textStatus, errorThrown){
            app.hideModalSpinner();
            $associateModal.find('.modal-body').html(jqXHR.responseText);
        });
    }
}

app.deleteAssociation = function(e) {
    e.preventDefault();

    var $target = $(e.target);
    var $item = $target.parents('.lsassociation');

    app.showModalSpinner("Removing Association");
    $.ajax({
        url: app.path.lsassociation_remove.replace('ID', $item.data('associationId')),
        method: 'POST'
    }).done(function(data, textStatus, jqXHR){
        app.hideModalSpinner();
        // after deletion, clear and reload item details
        app.clearItemDetails(app.lsItemId);
        app.loadItemDetails(app.lsItemId);

    }).fail(function(jqXHR, textStatus, errorThrown){
        app.hideModalSpinner();
        alert("An error occurred.");
    });
};

//////////////////////////////////////////////////////
// DELETE AN ITEM

app.deleteItems = function(itemIds) {
    var deleteItemsInternal = function(itemIds) {
        // activate document node
        app.getNodeFromLsItemId(null, "tree1").setActive();
        
        // show "Deleting" spinner
        app.showModalSpinner("Deleting");
        
        var completed = 0;
        for (var i = 0; i < itemIds.length; ++i) {
            console.log("deleting " + itemIds[i]);
            
            var node = app.getNodeFromLsItemId(itemIds[i]);
            if (node != null) {
                // delete node and set some properties of parent if we have one. It would be better to do this after the ajax has returned,
                // but it's tricky to know which item was deleted inside the .done function. If there was an error in the deletion process,
                // the user is probably going to reload the browser anyway.
                var parentNode = node.parent;
                node.remove();
                if (!app.isDocNode(parentNode) && (!$.isArray(parentNode.children) || parentNode.children.length === 0)) {
                    parentNode.folder = false;
                    parentNode.setExpanded(false);
                    parentNode.render();
                }

                $.ajax({
                    // for now at least, we always send "1" in for the "CHILDREN" parameter
                    url: app.path.lsitem_tree_delete.replace('ID', itemIds[i]).replace('CHILDREN', 1),
                    method: 'POST'
                }).done(function (data, textStatus, jqXHR) {
                    // if we're done hide the spinner
                    ++completed;
                    console.log("completed: " + completed);
                    if (completed == itemIds.length) {
                        app.hideModalSpinner();
                    }
                
                }).fail(function (jqXHR, textStatus, errorThrown) {
                    alert("An error occurred.");
                    // console.log(jqXHR.responseText);
                });
            } else {
                ++completed;
            }
        }
    };
    
    // if itemIds isn't an array, use selected item
    if (!$.isArray(itemIds)) {
        itemIds = [app.lsItemId];
    }
    
    // make user confirm
    var modalId;
    if (itemIds.length == 1) {
        var node = app.getNodeFromLsItemId(itemIds[0]);
        if ($.isArray(node.children) && node.children.length > 0) {
            modalId = '#deleteItemAndChildrenModal';
        } else {
            modalId = '#deleteOneItemModal'
        }
    } else {
        // fill count of deleted items in to deleteMultipleItemsModalCount
        $("#deleteMultipleItemsModalCount").text(itemIds.length);
        modalId = '#deleteMultipleItemsModal';
    }

    $(modalId).modal()
    .one('click', '.btn-delete', function() {
        $(this).closest('.modal').modal('hide');
        deleteItemsInternal(itemIds);
    });
};

/////////////////////////////////////////////////////
// FILTER ON TREES

app.filterOnTrees = function() {
    var debounce = (function() {
        var timeout = null;
        return function(callback, wait) {
            if (timeout) { clearTimeout(timeout); }
            timeout = setTimeout(callback, wait);
        };
    })();

    $(".treeFilter").on('keyup', function() {
        var $that = $(this);
        $tree = app.getTreeFromInput($that).fancytree("getTree");
        debounce(function(){
            if ($that.val().trim().length > 0) {
                $tree.filterNodes($that.val(), {
                    autoExpand: true,
                    leavesOnly: false
                });
                console.log("Show filterClear");
                $that.parent().find(".filterClear").show();

            } else {
                $tree.clearFilter();
                console.log("Hide filterClear");
                $that.parent().find(".filterClear").hide();
            }
        }, 500);
    });
    
    // clear buttons for search fields
    $(".filterClear").on('click', function() {
        $(this).parent().find(".treeFilter").val("").trigger("keyup");
    });
};
