var bibtexify = (function($) {
    // helper function to "compile" LaTeX special characters to HTML
    var htmlify = function(str) {
        // TODO: this is probably not a complete list..
        str = str.replace(/\\"\{a\}/g, '&auml;')
            .replace(/\{\\aa\}/g, '&aring;')
            .replace(/\\aa\{\}/g, '&aring;')
            .replace(/\\"a/g, '&auml;')
            .replace(/\\"\{o\}/g, '&ouml;')
            .replace(/\\'e/g, '&eacute;')
            .replace(/\\'\{e\}/g, '&eacute;')
            .replace(/\\'a/g, '&aacute;')
            .replace(/\\'A/g, '&Aacute;')
            .replace(/\\"o/g, '&ouml;')
            .replace(/\\ss\{\}/g, '&szlig;')
            .replace(/\{/g, '')
            .replace(/\}/g, '')
            .replace(/\\&/g, '&')
            .replace(/--/g, '&ndash;')
            .replace(/\{\\textperiodcentered\}/g, '&middot;')
            .replace(/\\textperiodcentered/g, '&middot;')
	;
        return str;
    };
    var uriencode = function(str) {
        // TODO: this is probably not a complete list..
        str = str.replace(/\\"\{a\}/g, '%C3%A4')
            .replace(/\{\\aa\}/g, '%C3%A5')
            .replace(/\\aa\{\}/g, '%C3%A5')
            .replace(/\\"a/g, '%C3%A4')
            .replace(/\\"\{o\}/g, '%C3%B6')
            .replace(/\\'e/g, '%C3%A9')
            .replace(/\\'\{e\}/g, '%C3%A9')
            .replace(/\\'a/g, '%C3%A1')
            .replace(/\\'A/g, '%C3%81')
            .replace(/\\"o/g, '%C3%B6')
            .replace(/\\ss\{\}/g, '%C3%9F')
            .replace(/\{/g, '')
            .replace(/\}/g, '')
            .replace(/\\&/g, '%26')
            .replace(/--/g, '%E2%80%93');
        return str;
    };

    // event handlers for the bibtex links
    var EventHandlers = {
        showbib: function showbib(event) {
            $(this).next(".bibinfo").removeClass('hidden').addClass("open");
            $("#shutter").show();
            event.preventDefault();
        },
        hidebib: function hidebib(event) {
            $("#shutter").hide();
            $(".bibinfo.open").removeClass("open").addClass("hidden");
            event.preventDefault();
        }
    };

    var Bib2HTML = function(data, $pubTable, options) {
        this.options = options;
        this.$pubTable = $pubTable;
        this.stats = { };
        this.initialize(data);
    };

    var bibproto = Bib2HTML.prototype;

    // helper functions to turn a single bibtex entry into HTML
    bibproto.bib2html = {
        // the main function which turns the entry into HTML
        entry2html: function(entryData, bib) {
            var type = entryData.entryType.toLowerCase();
            // default to type misc if type is unknown
            if(!(type in bib.bib2html)) {
                type = 'misc';
                entryData.entryType = type;
            }
            var itemStr = htmlify(bib.bib2html[type](entryData, bib));
            itemStr += bib.bib2html.links(entryData, bib);
	    if (bib.options.showbibtex)
		itemStr += bib.bib2html.bibtex(entryData);
            if (bib.options.tweet && entryData.url) {
                itemStr += bib.bib2html.tweet(entryData, bib);
            }
            return itemStr.replace(/undefined/g, '<span class="undefined">missing<\/span>');
        },
        // converts the given author data into HTML
        authors2html: function(entryData, bib) {
	    if (!(entryData.author instanceof Array) || (entryData.author.length == 0)) {
		if (entryData.editor)
		    return entryData.editor;
		else
		    return "Missing author/editor";
	    }
	    
            var authorsStr = '';
	    if (entryData.author.length == 1)
		authorsStr = bib.bibtex._formatAuthor(entryData.author[0]);
	    else if (entryData.author.length == 2)
		authorsStr = bib.bibtex._formatAuthor(entryData.author[0]) + " and " + bib.bibtex._formatAuthor(entryData.author[1]);
	    else {
		for (var index = 0; index < entryData.author.length - 1; index++) {
                    if (index > 0) { authorsStr += ", "; }
                    authorsStr += bib.bibtex._formatAuthor(entryData.author[index]);
		}
                authorsStr += ", and " + bib.bibtex._formatAuthor(entryData.author[entryData.author.length - 1]);
	    }
            return htmlify(authorsStr);
        },
        // converts the given author data into HTML
        authors2shorthtml: function(entryData, bib) {
	    if (!(entryData.author instanceof Array) || (entryData.author.length == 0)) {
		if (entryData.editor)
		    return entryData.editor;
		else
		    return "Missing author/editor";
	    }
            var authorsStr = '';
	    if (entryData.author.length == 1)
		authorsStr = entryData.author[0].last;
	    else if (entryData.author.length == 2)
		authorsStr = entryData.author[0].last + " and " + entryData.author[1].last;
	    else
		authorsStr = entryData.author[0].last + " et al.";
            return htmlify(authorsStr);
        },
	shortcite: function(entryData, bib) {
	    var year;
	    if (entryData.year == "To Appear")
		year = "";
	    else
		year = " (" + entryData.year + ")";
	    
	    if (entryData.author)
		return this.authors2shorthtml(entryData, bib) + year;
	    else
		return entryData.title + " (" + entryData.year + ")";
        },
        // adds links to the PDF or url of the item
        links: function(entryData, bib) {
            var itemStr = '';
	    if (entryData.url) {
                itemStr += ' <a title="This article online" href="' + entryData.url +
                    '"><span class="fa fa-external-link" style="color:#0000FF;"></span><\/a> ';
            }
	    if (entryData.doi) {
                itemStr += ' <a href="http://dx.doi.org/'+entryData.doi+'" target="_blank"><span class="fa fa-link" style="color:#0000FF;"></span></a> ';
            }
	    if (entryData.file && bib.options.file_links) {
		var files = entryData.file.split(";")
		for (var fileidx = 0; fileidx < files.length; ++fileidx) {
		    var data = files[fileidx].split(":");
		    //data[0] name of file, data[1] path to file, data[2]={PDF} file type
		    switch (data[2]) {
		    case "PDF":
			itemStr += '<a href="/static/literature/'+data[1]+'" target="_blank"><span class="fa fa-file-pdf-o" style="color:#e34947;"></span></a> ';
			break;
		    default:
			itemStr += '<a href="/static/literature/'+data[1]+'" target="_blank"><span class="fa fa-file-o"></span></a> ';
			break;
		    }
		}
	    }

            return itemStr;
        },
        // adds the bibtex link and the opening div with bibtex content
        bibtex: function(entryData, bib) {
            var itemStr = '';
            itemStr += ' (<a title="This article as BibTeX" href="#" class="biblink">' +
                'bib</a>)<div class="bibinfo hidden">';
            itemStr += '<a href="#" class="bibclose" title="Close">x</a><pre>';
            itemStr += '@' + entryData.entryType + "{" + entryData.cite + ",\n";
            $.each(entryData, function(key, value) {
                if (key == 'author') {
                    itemStr += '  author = { ';
                    for (var index = 0; index < value.length; index++) {
                        if (index > 0) { itemStr += " and "; }
                        itemStr += value[index].last;
                    }
                    itemStr += ' },\n';
                } else if (key != 'entryType' && key != 'cite') {
                    itemStr += '  ' + key + " = { " + value + " },\n";
                }
            });
            itemStr += "}</pre></div>";
            return itemStr;
        },
        // generates the twitter link for the entry
        tweet: function(entryData, bib) {
            // url, via, text
            var itemStr = ' (<a title="Tweet this article" href="http://twitter.com/share?url=';
            itemStr += entryData.url;
            itemStr += '&via=' + bib.options.tweet;
            itemStr += '&text=';
            var splitName = function(wholeName) {
		var spl = wholeName.split(' ');
		return spl[spl.length-1];
            };
            var auth = entryData.author;
            if (auth.length == 1) {
		itemStr += uriencode(splitName(auth[0].last));
            } else if (auth.length == 2) {
		itemStr += uriencode(splitName(auth[0].last) + "%26" + splitName(auth[1].last));
            } else {
		itemStr += uriencode(splitName(auth[0].last) + " et al");
            }
            itemStr += ": " + encodeURIComponent('"' + entryData.title + '"');
            itemStr += '" target="_blank">tweet</a>)';
            return itemStr;
        },
        // helper functions for formatting different types of bibtex entries
        inproceedings: function(entryData, bib) {
            return this.authors2html(entryData, bib) + " (" + entryData.year + "). "
		+ entryData.title + ". In <em>" + entryData.booktitle
                + ((entryData.address)?", " + entryData.address:"") + ".<\/em>";
        },
        article: function(entryData, bib) {
            return this.authors2html(entryData, bib) + ', &ldquo;' +
                entryData.title + ',&rdquo; <em>' + entryData.journal + "</em>, "
		+ ((entryData.volume)? "<b>" + entryData.volume + "</b>, " : "")
                + ((entryData.number) ? "(" + entryData.number + "), " : "")
		+ ((entryData.pages) ? entryData.pages + " " : "")
		+ ((entryData.year) ? "(" + entryData.year + ") " : "")
		+ ((entryData.address)? entryData.address + ".":"") ;
        },
        misc: function(entryData, bib) {
            return this.authors2html(entryData, bib) + " (" + entryData.year + "). " +
                entryData.title + ". " +
                ((entryData.howpublished)?entryData.howpublished + ". ":"") +
                ((entryData.note)?entryData.note + ".":"");
        },
        mastersthesis: function(entryData, bib) {
            return this.authors2html(entryData, bib) + " (" + entryData.year + "). " +
		entryData.title + ". " + entryData.type + ". " +
		entryData.organization + ", " + entryData.school + ".";
        },
        techreport: function(entryData, bib) {
            return this.authors2html(entryData, bib) + ", &ldquo;" +
                entryData.title + ",&rdquo; " + entryData.institution + ", <b>" +
                entryData.number + "</b> (" + entryData.year + ")";
        },
        book: function(entryData, bib) {
            return this.authors2html(entryData, bib) + " (" + entryData.year + "). " +
                " <em>" + entryData.title + "<\/em>, " +
                entryData.publisher + ", " + entryData.year +
                ((entryData.issn)?", ISBN: " + entryData.issn + ".":".");
        },
        inbook: function(entryData, bib) {
            return this.authors2html(entryData, bib) + " (" + entryData.year + "). " +
                entryData.chapter + " in <em>" + entryData.title + "<\/em>, " +
                ((entryData.editor)?" Edited by " + entryData.editor + ", ":"") +
                entryData.publisher + ", pp. " + entryData.pages + "" +
                ((entryData.series)?", <em>" + entryData.series + "<\/em>":"") +
                ((entryData.volume)?", Vol. " + entryData.volume + "":"") +
                ((entryData.issn)?", ISBN: " + entryData.issn + "":"") +
                ".";
        },
        // weights of the different types of entries; used when sorting
        importance: {
            'TITLE': 9999,
            'misc': 0,
            'manual': 10,
            'techreport': 20,
            'mastersthesis': 30,
            'inproceedings': 40,
            'incollection': 50,
            'proceedings': 60,
            'conference': 70,
            'article': 80,
            'phdthesis': 90,
            'inbook': 100,
            'book': 110,
            'unpublished': 120
        },
        // labels used for the different types of entries
        labels: {
            'article': 'Journal',
            'book': 'Book',
            'conference': 'Conference',
            'inbook': 'Book chapter',
            'incollection': '',
            'inproceedings': 'Conference',
            'manual': 'Manual',
            'mastersthesis': 'Thesis',
            'misc': 'Misc',
            'phdthesis': 'PhD Thesis',
            'proceedings': 'Conference proceeding',
            'techreport': 'Technical report',
            'unpublished': 'Unpublished'}
    };
    // format a phd thesis similarly to masters thesis
    bibproto.bib2html.phdthesis = bibproto.bib2html.mastersthesis;
    // conference is the same as inproceedings
    bibproto.bib2html.conference = bibproto.bib2html.inproceedings;
    
    bibproto.initialize = function initialize(data) {
        this.bibtex = new BibTex();
	this.bibtex.authorstring = "FIRST VON LAST JR";
        this.bibtex.content = data;
        this.bibtex.parse();
	this.entries = {};
        var bibentries = [];
        var entryTypes = {};
	var len = this.bibtex.data.length;
        jQuery.extend(true, this.bib2html, this.options.bib2html);
        for (var index = 0; index < len; index++) {
            var item = this.bibtex.data[index];
	    item.id = item.cite;
	    item.title = htmlify(item.title);
	    if (item.author)
		item.authors = this.bib2html.authors2html(item, this);

            if (!item.year) {
		item.year = this.options.defaultYear || "To Appear";
            }
            var html = this.bib2html.entry2html(item, this);
            bibentries.push([item.year, this.bib2html.labels[item.entryType], html]);
            entryTypes[this.bib2html.labels[item.entryType]] = item.entryType;
            this.updateStats(item);

	    if (item.cite in this.entries) {
		console.log("Repeated cite key for this bib entry.");
		console.log(item);
	    }
	    this.entries[item.cite] = item;
        }

	var self = this;
	if (this.$pubTable) {
            jQuery.fn.dataTableExt.oSort['type-sort-asc'] = function(x, y) {
		var item1 = self.bib2html.importance[entryTypes[x]],
                    item2 = self.bib2html.importance[entryTypes[y]];
		return ((item1 < item2) ? -1 : ((item1 > item2) ?  1 : 0));
            };
            jQuery.fn.dataTableExt.oSort['type-sort-desc'] = function(x, y) {
		var item1 = self.bib2html.importance[entryTypes[x]],
                    item2 = self.bib2html.importance[entryTypes[y]];
		return ((item1 < item2) ? 1 : ((item1 > item2) ?  -1 : 0));
            };
            var table = this.$pubTable.dataTable({ 'aaData': bibentries,
						   'aaSorting': this.options.sorting,
						   'aoColumns': [ { "sTitle": "Year" },
								  { "sTitle": "Type", "sType": "type-sort", "asSorting": [ "desc", "asc" ] },
								  { "sTitle": "Publication", "bSortable": false }],
						   'bPaginate': false
						 });
            if (this.options.visualization) {
		this.addBarChart();
            }
            $("th", this.$pubTable).unbind("click").click(function(e) {
		var $this = $(this),
		    $thElems = $this.parent().find("th"),
		    index = $thElems.index($this);
		if ($this.hasClass("sorting_disabled")) { return; }
		$this.toggleClass("sorting_asc").toggleClass("sorting_desc");
		if (index === 0) {
		    table.fnSort( [[0, $thElems.eq(0).hasClass("sorting_asc")?"asc":"desc"],
				   [1, $thElems.eq(1).hasClass("sorting_asc")?"asc":"desc"]]);
		} else {
		    table.fnSort( [[1, $thElems.eq(1).hasClass("sorting_asc")?"asc":"desc"],
				   [0, $thElems.eq(0).hasClass("sorting_asc")?"asc":"desc"]]);
		}
            });
            // attach the event handlers to the bib items
            $(".biblink", this.$pubTable).on('click', EventHandlers.showbib);
            $(".bibclose", this.$pubTable).on('click', EventHandlers.hidebib);
	}
    };
    // updates the stats, called whenever a new bibtex entry is parsed
    bibproto.updateStats = function updateStats(item) {
        if (!this.stats[item.year]) {
            this.stats[item.year] = { 'count': 1, 'types': {} };
            this.stats[item.year].types[item.entryType] = 1;
        } else {
            this.stats[item.year].count += 1;
            if (this.stats[item.year].types[item.entryType]) {
                this.stats[item.year].types[item.entryType] += 1;
            } else {
                this.stats[item.year].types[item.entryType] = 1;
            }
        }
    };
    // adds the barchart of year and publication types
    bibproto.addBarChart = function addBarChart() {
        var yearstats = [], max = 0;
        $.each(this.stats, function(key, value) {
            max = Math.max(max, value.count);
            yearstats.push({'year': key, 'count': value.count,
			    'item': value, 'types': value.types});
        });
        yearstats.sort(function(a, b) {
            var diff = a.year - b.year;
            if (!isNaN(diff)) {
		return diff;
            } else if (a.year < b.year) {
		return -1;
            } else if (a.year > b.year) {
		return 1;
            }
            return 0;
        });
        var chartIdSelector = "#" + this.$pubTable[0].id + "pubchart";
        var pubHeight = $(chartIdSelector).height()/max - 2;
        var styleStr = chartIdSelector +" .year { width: " +
            (100.0/yearstats.length) + "%; }" +
            chartIdSelector + " .pub { height: " + pubHeight + "px; }";
        var legendTypes = [];
        var stats2html = function(item) {
            var types = [],
                str = '<div class="year">',
                sum = 0;
            $.each(item.types, function(type, value) {
		types.push(type);
		sum += value;
            });
            types.sort(function(x, y) {
		return this.bib2html.importance[y] - this.bib2html.importance[x];
            });
            str += '<div class="filler" style="height:' + ((pubHeight+2)*(max-sum)) + 'px;"></div>';
            for (var i = 0; i < types.length; i++) {
                var type = types[i];
                if (legendTypes.indexOf(type) === -1) {
                    legendTypes.push(type);
                }
                for (var j = 0; j < item.types[type]; j++) {
                    str += '<div class="pub ' + type + '"></div>';
                }
            }
            return str + '<div class="yearlabel">' + item.year + '</div></div>';
        };
        var statsHtml = "<style>" + styleStr + "</style>";
        yearstats.forEach(function(item) {
            statsHtml += stats2html(item);
        });
        var legendHtml = '<div class="legend">';
        for (var i = 0, l = legendTypes.length; i < l; i++) {
            var legend = legendTypes[i];
            legendHtml += '<span class="pub ' + legend + '"></span>' + this.bib2html.labels[legend];
        }
        legendHtml += '</div>';
        $(chartIdSelector).html(statsHtml).after(legendHtml);
    };

    // Creates a new publication list to the HTML element with ID
    // bibElemId. The bibsrc can be
    //   - a jQuery selector, in which case html of the element is used
    //     as the bibtex data
    //   - a URL, which is loaded and used as data. Note, that same-origin
    //     policy restricts where you can load the data.
    // Supported options: 
    //   - visualization: A boolean to control addition of the visualization.
    //                    Defaults to true.
    //   - tweet: Twitter username to add Tweet links to bib items with a url field.
    //   - sorting: Control the default sorting of the list. Defaults to [[0, "desc"], 
    //              [1, "desc"]]. See http://datatables.net/api fnSort for details 
    //              on formatting.
    //   - bib2html: Can be used to override any of the functions or properties of
    //               the bib2html object. See above, starting around line 40.
    return function(bibsrc, opts, bibElemId) {
        var options = $.extend({},
			       {'visualization': false, 'sorting': [[0, "desc"], [1, "desc"]], file_links:false, showbibtex:false},
                               opts);
	
	if (bibElemId) {
	    if (options.visualization) {
		$pubTable.before('<div id="' + bibElemId + 'pubchart" class="bibchart"></div>');
            }
	    
            bibElemId = $("#" + bibElemId).addClass("bibtable");
	}
	
        return new Bib2HTML(bibsrc, bibElemId, options);
    };
})(jQuery);
