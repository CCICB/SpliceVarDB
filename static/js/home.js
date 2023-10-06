const apiURL = 'https://compbio.ccia.org.au/splicevardb-api/variants'
// const apiURL = 'https://10.10.70.18/splicevardb-api/variants/'
const validationURL = 'https://compbio.ccia.org.au/splicevardb-api/validation/'
const myVariant = 'https://myvariant.info/v1/variant/'
const clinvar = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&retmode=json&id="
const myGene = "https://mygene.info/v3/gene/"
const spliceAILookup = "https://spliceailookup-api.broadinstitute.org/spliceai/"
const pangolinLookup = "https://spliceailookup-api.broadinstitute.org/pangolin/"
const termsAPI = "https://compbio.ccia.org.au/splicevardb-api/termsAccept/"

let TOU = false;
let genome_build = "hg38";

const date = new Date();
const date_tag = date.getUTCFullYear() + (1 + date.getUTCMonth()).toString().padStart(2,'0') + date.getUTCDate().toString().padStart(2,'0');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Display all variants with basic api call
// Hide gene-level view on initial load
$( document ).ready(function() {
    call_api();

    // HEADER CONFIGURATION
    // fix main menu to page on passing
    $('.main.menu').visibility({
        type: 'fixed'
    });

    $('.overlay').visibility({
        type: 'fixed',
        offset: 80
    });
      
    // lazy load images
    $('.image').visibility({
        type: 'image',
        transition: 'vertical flip in',
    	duration: 500
    });
      
    // show dropdown on hover
    $('.main.menu  .ui.dropdown').dropdown({
    	on: 'hover'
    });

    document.getElementById('lollipop').style.display = "none";
    displayLoader();

    // If column visibilty changes then draw the table to update the filters.
    $('#results table').on( 'column-visibility.dt', function ( e, settings, column, state ) {
	$('#results table').DataTable().draw(false);
    } );

    $('#results table').on( 'search.dt', function () {
	downloadButton();
	variants=tableCount()
	if (variants < variantCount() && variants != 0) {
	    $("#download_filtered").show();
	} else {
	    $("#download_filtered").hide();
    	}
    });
});

function downloadButton() {
    if (TOU) {
    	$(".dt-buttons button").addClass("cci_green");
    } else if (tableCount() < 100) {
        $("#download_filtered").addClass("cci_green");
    } else {
	$(".dt-buttons button").removeClass("cci_green");
    }
}

function buildToggle(version) {
    var table = $('#results table').DataTable();
    let hg38_column = table.column(1);
    let hg19_column = table.column(2);
    if (version == "hg38") {
	if (!($("#hg38_toggle").hasClass("cci_green"))) {    
	    $("#hg19_toggle").removeClass("cci_green")
	    $("#hg38_toggle").addClass("cci_green")
	    genome_build = "hg38";
	    hg19_column.visible(false);
	    hg38_column.visible(true);
	}
    } else if (version == "hg19") {
	if (!($("#hg19_toggle").hasClass("cci_green"))) {
	    $("#hg38_toggle").removeClass("cci_green")
	    $("#hg19_toggle").addClass("cci_green")
	    genome_build = "hg19";
	    hg38_column.visible(false);
            hg19_column.visible(true);
	}
    }
    document.getElementById('lollipop').style.display = "none";
    populateProteinPaint();
}

function displayLoader() {
    $('#results').dimmer('show');
    $('#results .dimmer').addClass('inverted');
    $('#results .dimmer').append('<div class="ui text loader">Loading Variants</div>');

    var displayLoaderCheck = window.setInterval(function(){
	if ( $('#DataTables_Table_0').is(":visible") ) {
	    $('#buildToggle_buttons').show();
	    buildToggle("hg38");
	    makeFilter();
	    //$('.dtsb-titleRow').remove();
	    //$('.dtsb-add').removeClass('dtsb-button');
	    //$('.dtsb-search').addClass('ui basic button');
	    $('#results').dimmer('hide');
            $('#results .dimmer').empty();
	    clearInterval(displayLoaderCheck);
	    populateProteinPaint();
	}
    },500);
}

$('#TOU_pull button').on("click", function() {
    $('#Terms')
	.flyout('show')
    ;
});

function termsSubmit() {
    if ($('#Terms form').form('is valid')) {
	TOU = true;
    	downloadButton();
	$('#Terms')
            .flyout('hide')
        ;
	var $form = $('#Terms form')
	var values = $form.form('get values')

	addTerms(values);
	
    }
}

$('#Terms form')
  .form({
    fields: {
      name: {
        identifier: 'name',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter your name'
          }
        ]
      },
      affiliation: {
        identifier: 'affiliation',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter an affiliation'
          }
        ]
      },
      noncommercial: {
        identifier: 'noncommercial',
        rules: [
          {
            type   : 'checked',
            prompt : 'You must not work at a commercial organisation. Please read the above Terms of Use and follow the instructions to obtain an alternative license to download variants.'
          }
        ]
      },
      terms: {
        identifier: 'terms',
        rules: [
          {
            type   : 'checked',
            prompt : 'You must agree to the terms and conditions'
          }
        ]
      }
    }
  })
;

$.fn.dataTable.ext.search.push(function(
    settings,
    searchData,
    index,
    rowData,
    counter
  ) {

    // Get the Datatable global search term.
    var table = new $.fn.dataTable.Api( settings );
    var val = table.search().toLowerCase();

    // Return all rows if search is blank
    if (val === '') {
        return true;
    }

    // Get the columns.
    var columns = settings.aoColumns;

    for (var i = 0, ien = columns.length; i < ien; i++) {

      // If column is visible then check for a match.
      if ( columns[i].bVisible ) {
        if (searchData[i].toLowerCase().indexOf(val) !== -1) {
          return true;  // Matched value - display the row.
        }
      }
    }

    return false;  // No matches - hide row.
});

function variantCount() {
    var table = $('#results table').DataTable();
    return table.page.info().recordsTotal;
}

function fetchVariants(column) {
    var table = $('#results table').DataTable();
    if (column) {
	var variants = table.column(3).data();
    } else {
	var variants = table.data();
    }

    return variants.toArray();
}

function tableCount() {
    var table = $('#results table').DataTable();
    var filtered = table.rows({search:'applied'})
    return filtered.data().length;
}

function fetchTableVariants(column) {
    var table = $('#results table').DataTable();
    var data = table.rows({search:'applied'}).data().toArray();
    return data;
}

function populateProteinPaint(initial_data) {
    data = fetchTableVariants();

    let displayed_genes = []
    data.forEach(function (item, index) {
        displayed_genes.push(item.gene_symbol_list);
    });

    // Runs ProteinPaint if only one gene is left from filtering
    let uniqueGenes = [...new Set(displayed_genes)];
    if (uniqueGenes.length == 1) {
        if ( ($('#lollipop').filter(':hidden')) & ($('#gene_plot .dimmer').filter(':hidden')) ) {
            generateProteinPaint(data, uniqueGenes[0]);
        } else {
            if ( JSON.stringify(data) !== JSON.stringify(initial_data) ) {
                generateProteinPaint(data, uniqueGenes[0]);
            }
        }
    } else {
        $('#gene_plot').dimmer('hide');
        $('#gene_plot .dimmer').empty();
	document.getElementById('lollipop').style.display = "none";
        document.getElementById('lollipop_placeholder').style.display = "block";
    }
    // Recall function every 2 seconds with previous data as a comparison
    setTimeout(function() { populateProteinPaint(data) }, 2000);
}

function proteinPaintLoad() {
    $("#gene_plot").dimmer('show');
    $('#gene_plot .dimmer').addClass('inverted');
    $('#gene_plot .dimmer').append('<div class="ui text loader">Loading Visualisation</div>');

    var ppLoadCheck = window.setInterval(function(){
	if ( $('.sja_skg').length) {
            $('#gene_plot').dimmer('hide');
	    $('#gene_plot .dimmer').empty();
	    $('.sja_Block_div').css({"margin":"0","width":"100%"});
	    $('.sja_Block_div').children().eq(1).css("width","100%");
	    $('.sja_Block_div').children().eq(1).children().eq(0).children().eq(0).attr('transform', 'translate(40,0)');	
	    document.getElementsByClassName('sja_Block_div').item(0).children.item(3).style.display = "none";
            $('#lollipop').show();
	    clearInterval(ppLoadCheck);
        } else if ($('#gene_plot .dimmer').is(':empty')) {
	    clearInterval(ppLoadCheck);	
	}
    },500);
}

// API call from Alan
makeRequest = async (path, method, body) => {
    return fetch(path, {
        method: method || "GET",
	...(body ? { headers: { "Content-Type": "application/json" }, } : ""), 
	...(body ? { body: JSON.stringify(body) } : "" )
    }).then((res) => {
        if (res.status === 401) {
            return false
        } else {
            return res.json();
        }
    });
};

// addTerms = async (input_name, input_affil, input_role, input_purpose, input_noncommercial, input_terms, variants) =>
    
addTerms = async (values) =>
    makeRequest(`${termsAPI}`,
	"POST",
	{ 
        'name': values.name, 
        'affiliation': values.affiliation, 
        'role': values.role,
        'purpose': values.purpose.toString(),
	'noncommercial': 1,
	'terms': 1,
	'variants_downloaded': tableCount()
     }
    );

//addTerms = async (values) =>
//    makeRequest(`${termsAPI}`, "POST", values);

getMyVariant = async (variant) =>
    makeRequest(`${myVariant}${variant}`, "GET", null);

getClinvar = async (variant) =>
    makeRequest(`${clinvar}${variant}`, "GET", null);

getValidation = async (variant_id) =>
    makeRequest(`${validationURL}${variant_id}`, "GET", null);

getMyGene = async (gene) =>
    makeRequest(`${myGene}${gene}`, "GET", null);

getSpliceAI = async (variant) =>
    makeRequest(`${spliceAILookup}` + "?hg=37&distance=1000&variant=" + `${variant}`, "GET", null);

getPangolin = async (variant) =>
    makeRequest(`${pangolinLookup}` + "?hg=37&distance=1000&variant=" + `${variant}`, "GET", null);

// Basic API call
function call_api() {
    fetch(apiURL)
      .then(function (response) {
          return response.json();
      })
      .then(function (data) {
          appendData(data);
      })
      .catch(function (err) {
          console.log(err);
    });
}

// Add Search Builder
function makeFilter() {
    $('#DataTables_Table_0_wrapper').prepend('<div id="filters"><button id="filterToggle" class="ui basic button">Launch Custom Filter</button></div>');
    $('#filterToggle').on('click', function() {
	var gene_list = geneList().sort();
	var gene_filter = '<div class="filter">' +
                    '<label>Gene List:</label><select class="ui multiple five column search clearable selection dropdown">' +
                    '<option value="">Gene</option>'

	gene_list.forEach(function (gene, index) {
	    gene_filter = gene_filter + 
		'<option value="' + gene + '">' + gene + '</option>'
	});
	$('#filters').html(gene_filter + '</select></div>');
	$('.ui.dropdown').dropdown();
    });
}

// Get Genes
function geneList(data) {
    data = fetchVariants(3);
    console.log(data);
    
    let gene_list = [];
    data.forEach(function(gene_entry) {
	gene_entry.split(",").forEach(function(gene) {
	    gene_list.push(gene);
	});
    });
    // Runs ProteinPaint if only one gene is left from filtering
    let uniqueGenes = [...new Set(gene_list.sort())];

    return uniqueGenes;
}

// Adds passed data into the display table
function appendData(variants) {
    // clear the table
    $('.variants table > tbody').empty();

    var table = $('.variants table').DataTable({
        data: variants,
	dom: 'frtipB',
	buttons: [
            {
            	filename: 'splicevardb.' + date_tag,
		extension: '.tsv',
		fieldSeparator: '\t',
                text: 'Download All Variants',
                exportOptions: {
                    modifier: {
                        search: 'none'
                    }
                },
                attr: {
                    id: 'download_all'
                },
            	action: function ( e, dt, node, config ) {
		    if (TOU) {
			$.fn.dataTable.ext.buttons.csvHtml5.action.call(this, e, dt, node, config);
                    } else {
                    	$('#Terms')
                            .flyout('show')
                        ;
			var awaitTOC = window.setInterval(function(){
			    if ( !$('#Terms').hasClass("visible") ) {
				if (TOU) {
				    $("#download_all").trigger("click");
        		        } 
				clearInterval(awaitTOC);
			    }
    			},500);
                    }
		}
            },
	    {
                filename: 'splicevardb.' + date_tag + '.filtered',
		extension: '.tsv',
                fieldSeparator: '\t',
                text: 'Download Filtered Variants',
		attr: {
		    id: 'download_filtered'
		},
                action: function ( e, dt, node, config ) {
                    if (TOU) {
                        $.fn.dataTable.ext.buttons.csvHtml5.action.call(this, e, dt, node, config);
		    } else if (tableCount() < 100) {
                    	$.fn.dataTable.ext.buttons.csvHtml5.action.call(this, e, dt, node, config);
		    } else {
                        $('#Terms')
                            .flyout('show')
                        ;
                        var awaitTOC = window.setInterval(function(){
                            if ( !$('#Terms').hasClass("visible") ) {
                                if (TOU) {
				    $("#download_filtered").trigger("click");
                                } 
				clearInterval(awaitTOC);
                            }
                        },500);
                    }
                }
            }
    	],
        columns: [
                {
                    className: 'dt-control',
                    orderable: false,
                    data: null,
                    defaultContent: '',
                },
                { data: 'chr' },
		{ data: 'chr' },
                { data: 'gene_symbol_list' },
                { data: 'hgvs_RefSeq' },
                { data: 'method_report'},
                { data: 'classification'},
		{ data: 'location'}
            ],
            columnDefs: [{
                "target": 1,
                "render": function( data, type, row) {
                    return data +'-'+ row.pos_hg38 +'-'+ row.ref +'-'+ row.alt;
                },
	    },
	    {
                "target": 2,
                "render": function( data, type, row) {
                    return data +'-'+ row.pos_hg19 +'-'+ row.ref +'-'+ row.alt;
            	},
            },
	    {
		"target": 3,
		"render": function( data, type, row) {
                    return '<i>' + data + '</i>';
		},
	    },
	    {
		"target": 7,
		"visible": false,
		"searchable": true
	    }
	    ]
    });

    $('tbody').on('click', 'td.dt-control', async function () {
        var tr = $(this).closest('tr');
        var row = table.row(tr);
	console.log(row)
        if (row.child.isShown()) {
            // This row is already open - close it
            row.child.hide();
            tr.removeClass('shown');
        } else {
            // Open this row
	    row.child(formatChild(row.data(), row)).show();
            tr.addClass('shown');

	    $('.igvToggle').on('click', function() {
    		var table = $('.variants table').DataTable()
    		var tr = $(this).closest('tr').prev('.shown');
    		var row = table.row(tr);
		$(this).hide();
		formatIGV(row);
	    });
	
	    // row.child('<div class="ui segment" style="height: 60px; margin: 0!important;"><div class="ui active inverted dimmer" style="height: 60px; padding: 0; margin: 1em 0;"><div class="ui text loader">Loading Variant Information</div></div></div>').show();
            let myVariant_format = "chr" + row.data().chr + ":g." + row.data().pos_hg19 + row.data().ref + ">" + row.data().alt;
            let myVariant_data = await getMyVariant(myVariant_format);
	    if (myVariant_data.code) {
		myVariant_data = "none";
	    }

	    let clinvar_data = "none";

            if (myVariant_data.clinvar) {
		let clinvar_id = myVariant_data.clinvar.variant_id;
		let clinvar_api = await getClinvar(clinvar_id);
		clinvar_data = clinvar_api.result[clinvar_id]
	    }

	    formatVariantInfo(row.data(), myVariant_data, clinvar_data);
		
            // let ensembl_id = myVariant_data.cadd.gene[0].gene_id;
            // let myGene_data = await getMyGene(ensembl_id);
	
	    // let validation_data = await getValidation(row.data().variant_id);
	    formatValidation(await getValidation(row.data().variant_id));

            let broadLookup_format = "chr" + row.data().chr + "-" + row.data().pos_hg19 + "-" + row.data().ref + "-" + row.data().alt;
            let spliceAI_data = await getSpliceAI(broadLookup_format);
	    let pangolin_data = await getPangolin(broadLookup_format);

            if (spliceAI_data && pangolin_data) {
	    	var spliceAI_score = spliceAI_data.scores[0]
		var pangolin_score = pangolin_data.scores[0]
		formatInSilicos(row.data(), spliceAI_score, pangolin_score);
            } else {
		$('.insilico_id' + row.data().variant_id).append('<p>ERROR: No Scores Returned.</p>');
	    }

	    // formatIGV(row)
	}
    });
};

// $('.igvToggle').on('click', function() {
function formatIGV(row) {
    if (genome_build == "hg19") {
	var variant_pos = row.data().pos_hg19;
	var reference_object = {
    	    "id": "hg38",
    	    "name": "Human (GRCh37/hg19)",
    	    "fastaURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fa",
	    "indexURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fa.fai",
    	    "cytobandURL": "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/cytoBandIdeo.txt",
	    "tracks": [
      		{
        	    "name": "Refseq Genes",
		    "format": "refgene",
        	    "url": "https://s3.amazonaws.com/igv.org.genomes/hg19/refGene.txt.gz",
        	    "order": 1000000,
        	    "indexed": false,
		    "visibilityWindow": -1,
		    "removable": false,
		    "displayMode": "COLLAPSED"
      		}
	    ]
  	}
    } else if (genome_build == "hg38") {
	var variant_pos = row.data().pos_hg38;
	var reference_object = {
            "id": "hg38",
            "name": "Human (GRCh38/hg38)",
            "fastaURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa",
            "indexURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa.fai",
            "cytobandURL": "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg38/cytoBandIdeo.txt",
            "tracks": [
                {
                    "name": "Refseq Genes",
		    "format": "refgene",
                    "url": "https://s3.amazonaws.com/igv.org.genomes/hg38/refGene.txt.gz",
                    "order": 1000000,
                    "indexed": false,
		    "visibilityWindow": -1,
      		    "removable": false,
		    "displayMode": "COLLAPSED"
                }
            ]
	}
    }

    var igvDiv = row.child().find(".variant-visualisation")[0];
    igvDiv.style.minHeight = "360px";
    if ( row.data().classification == "Splice-altering" ) {
        var color = "rgba(219, 61, 61,0.5)";
    } else if ( row.data().classification == "Low-frequency" ) {
        var color = "rgba(160, 32, 240, 0.5)";
    } else if ( row.data().classification == "Normal" ) {
        var color = "rgba(57, 135, 204, 0.5)";
    } else {
        var color = "rgba(140,140,140, 0.5)";
    }
    var options =
        {
	    locus: "chr" + row.data().chr + ':' + (variant_pos - 200) + "-" + (variant_pos - -200),
            roi: [
                    {
                        name: "Variant",
                        color: color,
                        features: [
                            {
                                chr: "chr" + row.data().chr,
                                start: variant_pos - 1,
                                end: variant_pos,
                                description: "Variant of interest",
                            }
                        ]
                    }
            ],
            tracks: [
                    {
                        name: "U12",
                        type: "annotation",
                        format: "bed",
                        url: "https://raw.githubusercontent.com/CCICB/introme/master/annotations/U12." + genome_build + ".bed.gz",
                        displayMode: "EXPANDED",
			height: 40,
                        color: "#ff0000",
                    },
                    {
                        name: "Branchpoints",
                        type: "annotation",
                        format: "bed",
                        url: "https://raw.githubusercontent.com/CCICB/introme/master/annotations/branchpointer." + genome_build + ".bed.gz",
                        displayMode: "EXPANDED",
			height: 40,
                        color: "#ff0000",
                    },
            ],
	    reference: reference_object
    };
    igv.createBrowser(igvDiv, options)
};


// proteinPaint Plot
function generateProteinPaint(data, gene) {
    document.getElementById('lollipop_placeholder').style.display = "none";
    $('#lollipop').empty();
    proteinPaintLoad();
    let proteinPaintData = convert_to_protein_paint(data);
    runproteinpaint({
         noheader:1,
         holder: document.getElementById('lollipop'),
         parseurl:true,
         nobox:1,
         genome: genome_build,
         gene: gene,
         mclassOverride: {
             className: 'Classification',
             classes: {
                 S: {
                     label: 'Splice-altering',
                     color: '#db3d3d'
                 },
                 L: {
                     label: 'Low-frequency',
                     color: '#A020F0'
                 },
                 N: {
                     label: 'Normal',
                     color: '#3987cc'
                 },
		 X: {
		     label: 'Conflicting',
		     color: '#808080'
		 }
             }
        },
        tracks:[{
            type:'mds3',
            name:'SpliceVarDB',
            custom_variants: JSON.parse(JSON.stringify(proteinPaintData)),
        }]
    });
};

function convert_to_protein_paint(snv) {
    let result = [];
    snv.forEach(function (variant, index) {
	if (genome_build == "hg19") {
	    var variant_pos = variant.pos_hg19;
        } else if (genome_build == "hg38") {
            var variant_pos = variant.pos_hg38;
        }
        // Extract the first letter of the classification to use for the class
        let classifier = variant.classification.charAt(0).replace("C", "X");
        plot_item = {
            'dt': 1,
	    // 'mname': variant.hgvs_RefSeq.split(":")[1],
            'gene': variant.gene_symbol_list,
            'chr': "chr" + variant.chr,
            'pos': Number(variant_pos),
            'ref': variant.ref,
            'alt': variant.alt,
            'class': classifier
        }
        result.push(plot_item);
    });
    return result;
}

function formatChild(d, row) {
    return (
        '<div class="ui grid">' +

        '<div class="ui row">' +
	'<div class="one wide column" style="padding: 0;"></div>' + //padding
	'<div class="varinfo_id' + d.variant_id + ' five wide column" style="padding: 0;"><h5>Variant Information</h5></div>' +
        '<div class="insilico_id' + d.variant_id + ' five wide column" style="padding: 0;"><h5>Splicing <i>In Silicos</i>:</h5></div>' +
        '<div class="validation_id' + d.variant_id + ' five wide column" style="padding: 0"><h5>Validation Details</h5></div>' +
	'</div>' +

	'<div class="row">' +
	'<div class="sixteen wide column" style="padding: 0;">' +
        '<div class="variant-visualisation" id="igv-div" style="padding: 5px 10px;">' +
        '</div>' + 
	'<div class="ui button igvToggle" style="width: 100%; padding: 10px 0; border-radius: 0 0 10px 10px">Load IGV</div>' +
	'</div></div>'
    );
}

function formatVariantInfo(d, myVariant_data, clinvar_data) {
    let clinvar_sig = "Not Present in ClinVar";
    let clinvar_review_status = "none";

    if (clinvar_data != "none") {
        clinvar_sig = clinvar_data.clinical_significance.description;
        clinvar_review_status = clinvar_data.clinical_significance.review_status;
    }

    if (clinvar_sig == "Pathogenic" || clinvar_sig == "Likely pathogenic" || clinvar_sig == "Pathogenic/Likely pathogenic" ) {
        clinvar_colour = "#FFEFEF";
    } else if (clinvar_sig == "Benign" || clinvar_sig == "Likely benign" || clinvar_sig == "Benign/Likely benign") {
        clinvar_colour = "#EAF8ED";
    } else if (clinvar_sig == "Uncertain significance") {
        clinvar_colour = "#EDFAFD";
    } else {
        clinvar_colour = "FDFDED";
    }

    if (clinvar_review_status == "practice guideline") {
        var clinvar_star_rating = 4;
    } else if (clinvar_review_status == "reviewed by expert panel") {
        var clinvar_star_rating = 3;
    } else if (clinvar_review_status == "criteria provided, multiple submitters, no conflicts") {
        var clinvar_star_rating = 2;
    } else if (clinvar_review_status == "criteria provided, conflicting interpretations" || clinvar_review_status == "criteria provided, single submitter" ) {
        var clinvar_star_rating = 1;
    } else {
        var clinvar_star_rating = 0;
    }

    if (myVariant_data.dbsnp) {
        var rsid_present = 1;
        var rsid = myVariant_data.dbsnp.rsid;
    } else {
        var rsid_present = 0;
    }

    let genome_af = 0;
    let exome_af = 0;
    let genome_homs = 0;
    let exome_homs = 0;
    if (myVariant_data.gnomad_genome) {
        genome_af = myVariant_data.gnomad_genome.af.af;
        genome_hom = myVariant_data.gnomad_genome.hom.hom;
    }
    if (myVariant_data.gnomad_exome) {
        exome_af = myVariant_data.gnomad_exome.af.af;
        exome_hom = myVariant_data.gnomad_exome.hom.hom;
    }

    let consequence = "N/A";
    if (myVariant_data.snpeff) {
        var cons_present = 1
        if (myVariant_data.snpeff.ann.length) {
            consequence = myVariant_data.snpeff.ann[0].effect;
        } else {
            consequence = myVariant_data.snpeff.ann.effect;
        }
    } else if (myVariant_data.cadd) {
        var cons_present = 1;
        if (typeof myVariant_data.cadd.consdetail == "string") {
            consequence = myVariant_data.cadd.consdetail;
        } else {
            consequence = myVariant_data.cadd.consdetail[0];
        }
    } else {
        var cons_present = 0;
    }

    if (consequence) {
        consequence = consequence.replaceAll("&"," & ").replaceAll("_"," ").replaceAll(" variant","")
        consequence = consequence.charAt(0).toUpperCase() + consequence.slice(1);
    }

    $('.varinfo_id' + d.variant_id).html('<h5>Variant Information</h5>' +
        '<div class="clinvar-label"></div>' +
        '<div class="ui segment clinvar" style="background-color: ' + clinvar_colour + '; margin: 0.5em 0; padding: 0.5em;">' +
            '<h5>' + clinvar_sig + '</h5>'+
            (clinvar_star_rating == 0 ? '</div>' : '<div class="clinvar-star" style="--rating: ' + clinvar_star_rating + ';"></div></div>') +
        (rsid_present ? '<p>rsID: <a href="https://www.ncbi.nlm.nih.gov/snp/' + rsid + '" target="_blank">' + rsid + '</a></p>' : "" ) +
        '<p>gnomAD Genome AF: ' + genome_af + '</p>' +
        '<p>gnomAD Exome AF: ' + exome_af + '</p>' +
        '<p>gnomAD Homozygotes: ' + (genome_homs + exome_homs) + '</p>' +
        '<p>Variant Location: ' + d.location + '</p>' +
        '<p>Consequence: ' + consequence + '</p>'
    );
}

function formatInSilicos(d, spliceAI, pangolin) {
    $('.insilico_id' + d.variant_id).html('<h5>Splicing <i>In Silicos</i>:</h5>' +
        '<p>Introme: ' + d.introme + '</p>' +
        '<p>SpliceAI:</p>' +
        '<ul><li>Acceptor Gain: ' + Math.round(spliceAI.DS_AG * 100)/100 + ' @ ' + spliceAI.DP_AG + '</li>' +
        '<li>Acceptor Loss: ' + Math.round(spliceAI.DS_AL * 100)/100 + ' @ ' + spliceAI.DP_AL + '</li>' +
        '<li>Donor Gain: ' + Math.round(spliceAI.DS_DG * 100)/100 + ' @ ' + spliceAI.DP_DG + '</li>' +
        '<li>Donor Loss: ' + Math.round(spliceAI.DS_DL * 100)/100 + ' @ ' + spliceAI.DP_DL + '</li></ul>' +
        '<p>Pangolin:</p>' +
        '<ul><li>Gain: ' + Math.round(pangolin.DS_SG * 100)/100 + ' @ ' + pangolin.DP_SG + '</li>' +
        '<li>Loss: ' + Math.round(pangolin.DS_SL * 100)/100 + ' @ ' + pangolin.DP_SL + '</li>'
    );
}

// Format and append third column in variant expand
// Add entry for each validation attached to that variant ID
function formatValidation(v) {
    console.log(v)
    v.forEach(function(item, index) {
    	$('.validation_id' + item.variant_id).append(
            '<p>' + item.method + 
	    '<ul><li><a href="https://doi.org/' + item.doi +'" target="_blank">' + item.doi + '</a></p>' +
            (item.tissue ? '<li>Tissue used: ' + item.tissue + '</li>' : "" ) +
	    (item.metric1_name ? '<li>' + item.metric1_name + ': ' + item.metric1 + '</li>' : "" ) +
	    (item.metric2 ? '<li>' + item.metric2_name + ': ' + (item.doi == "10.1371/journal.pgen.1009884" ? (item.metric2 == 0 ? "<0.05" : ">=0.05" ) : item.metric2) + '</li>' : "" ) +	    
            '<li>Classification: ' + item.classification + '</li></ul>'
    	);
    });
}
