const splicevardbAPI = 'http://127.0.0.1:5000/splicevardb-api'
// const splicevardbAPI = 'https://compbio.ccia.org.au/splicevardb-api'

let TOU = false;
let genome_build = "hg38";

const date = new Date();
const date_tag = date.getUTCFullYear() + (1 + date.getUTCMonth()).toString().padStart(2,'0') + date.getUTCDate().toString().padStart(2,'0');

var comma_genes = [];
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Display all variants with basic api call
// Hide gene-level view on initial load
$( document ).ready(function() {
    call_api();

    if (localStorage.getItem('splicevardb_token')) {
        $('#Login_pull').text('Token');
        const token = localStorage.getItem('splicevardb_token');
        const expiryDate = new Date(parseJwt(token).exp * 1000);
        if (Date.now() >= parseJwt(token).exp * 1000) {
            $('#Signin #welcome_message #welcome_token_refresh').addClass('cci_green');
        }
            
        $('#Signin #login_form').hide();
        $('#TOU_pull').hide();
        $('#Login_pull').text('Token');
        $('#Signin #welcome_message').show();
        $('#Signin #welcome_message #welcome_token_expiry').text(`Your token is valid until ${expiryDate.toDateString()}`);
        $('#Signin #welcome_message #welcome_name').text(`Welcome ${parseJwt(token).sub.name}`);
        $('#Signin #welcome_message #welcome_token').val(localStorage.getItem('splicevardb_token'));
    }
    $('#request_button').hide();
    $('#secret_tunnel').hide();
    $('#field_select').change(() => {
        const selected = $('#field_select').val();
        if (selected === 'commercial') {
            $('#commercial_purpose').show();
            $('#purpose').hide();

            $('#register_button').hide();
            $('#request_button').show();
        } else {
            $('#commercial_purpose').hide();
            $('#purpose').show();

            $('#register_button').show();
            $('#request_button').hide();
        }

        if (selected === 'academic') {
            $('#spliceai_checkbox').prop( "checked", true );
        } else {
            $('#spliceai_checkbox').prop( "checked", false );
        }
    });

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
    });
});

function logout() {
    localStorage.removeItem('splicevardb_token');
    downloadButton();
    $('#TOU_pull').show();
    $('#Login_pull').text('Sign in');
    $('#Signin #login_form').show();
    $('#Signin #welcome_message').hide();
}

function downloadButton() {
    if (localStorage.getItem('splicevardb_token')) {
    	$(".dt-buttons button").addClass("cci_green");
    } else if (tableCount() < 100) {
        $(".dt-buttons button").addClass("cci_green");
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
    if ($('#lollipop').is(':visible')) {
        document.getElementById('lollipop').style.display = "none";
        populateProteinPaint();
    }
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
            $('#results').dimmer('hide');
            $('#results .dimmer').empty();
            clearInterval(displayLoaderCheck);
            populateProteinPaint();
        }
    },500);
}

$('#TOU_pull').on("click", function() {
    $('#Terms').flyout('show');
    $('.ui.dropdown').dropdown();
});

$('#Login_pull').on("click", function() {
    $('#Signin').flyout('show');
    if (localStorage.getItem('splicevardb_token')) {
        const info = parseJwt(localStorage.getItem('splicevardb_token'));
        $('#Signin #login_form').hide();
        $('#Signin #welcome_message').show();
        $('#Signin #welcome_message #welcome_name').text(`Welcome ${info.sub.name}`);
        $('#Signin #welcome_message #welcome_token').val(localStorage.getItem('splicevardb_token'));
    }
    $('.ui.dropdown').dropdown();
});

$('#Submit_pull').on("click", function() {
    $('#Submit')
        .flyout('show')
    ;
    $('.ui.dropdown').dropdown();
    $('.ui.radio.checkbox')
      	.checkbox()
    ;
    submitOptions("published", "form");
});

function submitOptions(source, format) {
    var $form = $('#Submit form')
    var values = $form.form('get values')
    $('#Submit .ui.error.message').empty();
    // console.log(values)
    if (source) { 
	    $("#submit_source button").removeClass("cci_green")
        $("input[name='published']").val('')
        $("input[name='preprint']").val('')
        $("input[name='unpublished']").val('')
    	if (source == "published") {
            $("#published").addClass("cci_green")
	        $(".field.unpublished").hide()
            $(".field.preprint").hide()
	        $(".field.publication").show()
	        $("input[name='published']").val(true)
    	} else if (source == "preprint") {
	        $("#preprint").addClass("cci_green")
	        $(".field.unpublished").hide()
            $(".field.publication").hide()
            $(".field.preprint").show()
	        $("input[name='published']").val(true)
	        $("input[name='preprint']").val(true)
    	} else if (source == "unpublished") {
	        $("#unpublished").addClass("cci_green")
	        $(".field.preprint").hide()
            $(".field.publication").hide()
            $(".field.unpublished").show()
	        $("input[name='unpublished']").val(true)
    	}
    }

    if (format) {
    	$("#submit_format button").removeClass("cci_green")
        $("input[name='form']").val('')
        $("input[name='template']").val('')
    	if (format == "form") {
            $("#form_submit").addClass("cci_green")
	        $(".field.template, .fields.template").hide()
            $(".field.form, .fields.form").show()
	        $("input[name='form']").val(true)
    	} else if (format == "template") {
            $("#template_submit").addClass("cci_green")
            $(".field.template, .fields.template").show()
            $(".field.form, .fields.form").hide()
            $("input[name='template']").val(true)
    	}
    }
}

$('#Submit form')
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
      email: {
        identifier: 'email',
        rules: [
          {
            type   : 'email',
            prompt : 'Please enter a valid email'
          }
        ]
      },
      involved: {
        identifier: 'involved',
	depends: 'unpublished',
        rules: [
          {
            type   : 'checked',
            prompt : 'We require that the submitter of unpublished validation data be involved in the generation of the results.'
          }
        ]
      },
      doi: {
        identifier: 'DOI',
	depends: 'published',
        rules: [
	  {
            type   : 'regExp[10.[0-9]{4,9}/[-._;()/:a-z0-9A-Z]+]',
            prompt : 'Please provide a valid DOI.'
          }
        ]
      },
      variant: {
        identifier: 'variant',
        depends: 'form',
        rules: [
          {
            type   : 'regExp[([0-9]{1,2}|X|Y)-([0-9]+)-(A|C|G|T)+-(A|C|G|T)+]',
            prompt : 'Please provide a valid variant.'
          }
        ]
      },
      method: {
        identifier: 'method',
	depends: 'form',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter a validation method'
          }
        ]
      },
      metric_name: {
        identifier: 'metric_name',
	depends: 'form',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter a validation metric. If no metric was obtained, please just use "Splice-altering" and "Yes/No".'
          }
        ]
      },
      metric_value: {
        identifier: 'metric_value',
        depends: 'metric_name',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter a validation metric. If no metric was obtained, please just use "Splice-altering" and "Yes/No".'
          }
        ]
      },
      template: {
        identifier: 'templateFile',
        depends: 'template',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please supply the template file.'
          }
        ]
      }
    }
  })
;

function parseJwt (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

async function loginSubmit() {
    if ($('#Signin form').form('is valid')) {
	    var $form = $('#Signin form')
	    var values = $form.form('get values')
        const result = await login({
            email: values.email,
            password: values.password
        })
        if (result.token && result.name) {
            const token = result.token;
            localStorage.setItem("splicevardb_token", token);
            downloadButton();

            const expiryDate = new Date(parseJwt(token).exp * 1000);
            
            $('#Signin #login_form').hide();
            $('#TOU_pull').hide();
            $('#Login_pull').text('Token');
            $('#Signin #welcome_message').show();
            
            if (Date.now() >= parseJwt(token).exp * 1000) {
                $('#Signin #welcome_message #welcome_token_refresh').addClass('cci_green');
            }
            $('#Signin #welcome_message #welcome_token_expiry').text(`Your token is valid until ${expiryDate.toDateString()}`);
            $('#Signin #welcome_message #welcome_name').text(`Welcome ${parseJwt(token).sub.name}`);
            $('#Signin #welcome_message #welcome_token').val(localStorage.getItem('splicevardb_token'));

        } else {
            const err = result.message;
            alert(err)
        }
    }
}

async function refreshToken() {
    if (localStorage.getItem("splicevardb_token")) {
        const email = parseJwt(localStorage.getItem("splicevardb_token")).sub.email;
        const result = await refresh(email);
        if (result.token) {
            localStorage.setItem("splicevardb_token", result.token);
            $('#Signin #welcome_message #welcome_token').val(result.token);
            if ($('#Signin #welcome_message #welcome_token_refresh').hasClass('cci_green')) {
                $('#Signin #welcome_message #welcome_token_refresh').removeClass('cci_green');
            }
            
        }
    }
}

async function termsSubmit() {
    if ($('#Terms form').form('is valid')) {
	    var $form = $('#Terms form')
	    var values = $form.form('get values')
        const result = await register({
            name: values.name,
            email: values.email,
            password: values.password,
            affiliation: values.affiliation,
            field: values.field,
            purpose: values.purpose,
            spliceai: values.field === 'academic' ? true : values.spliceai === 'on',
            role: values.role
        })
        if (result.token && result.name) {
            const token = result.token;
            localStorage.setItem("splicevardb_token", token);

            const expiryDate = new Date(parseJwt(token).exp * 1000);

            $('#Terms').flyout('hide');
            $('#TOU_pull').hide();
            downloadButton();
            $('#Login_pull').text('Token');
            $('#Signin #welcome_message').show();
            if (Date.now() >= parseJwt(token).exp * 1000) {
                $('#Signin #welcome_message #welcome_token_refresh').addClass('cci_green');
            }
            $('#Signin #welcome_message #welcome_token_expiry').text(`Your token is valid until ${expiryDate.toDateString()}`);
            $('#Signin #welcome_message #welcome_name').text(`Welcome ${parseJwt(token).sub.name}`);
            $('#Signin #welcome_message #welcome_token').val(localStorage.getItem('splicevardb_token'));
        } else {
            const err = result.message;
            alert(err)
        }
    }
}

function emailRequest() {
    if ($('#Terms form').form('is valid')) {
	    var $form = $('#Terms form')
	    var values = $form.form('get values')
        alert('Your request has been submitted to the data access committee, you will be contacted shortly.')
        $('#secret_tunnel').trigger('click');
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
      email: {
        identifier: 'email',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter your email'
          }
        ]
      },
      password: {
        identifier: 'password',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter a password'
          }
        ]
      },
      field: {
        identifier: 'field',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please select an organisation type'
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
$('#Signin form')
    .form({
        email: {
            identifier: 'email',
            rules: [
                {
                    type   : 'empty',
                    prompt : 'Please enter your email'
                }
            ]
        },
        password: {
            identifier: 'password',
            rules: [
                {
                    type   : 'empty',
                    prompt : 'Please enter a password'
                }
            ]
        },
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
	    var variants = table.column(column).data();
    } else {
	    var variants = table.data();
    }

    return variants.toArray();
}

function tableCount() {
    var table = $('#results table').DataTable();
    var filtered = table.rows( {search:'applied'} ).data();
    return filtered.length;
}

function fetchTableVariants(column) {
    var table = $('#results table').DataTable();
    var filtered = table.rows( {search:'applied'} ).data().toArray();

    if (column) {
        var variants = []
	filtered.forEach(function(variant) {
	    variants.push(variant[column]);
	});
	return variants
    } else {
        return filtered
    }
}

function populateProteinPaint(initial_data) {
    table_data = fetchTableVariants();
    // Runs ProteinPaint if only one gene is left from filtering
    let uniqueGenes = uniqueValues("gene_symbol_list", "filtered");
    
    if (uniqueGenes[0].length == 1) {
        if ( ($('#lollipop').filter(':hidden')) & ($('#gene_plot .dimmer').filter(':hidden')) ) {
            generateProteinPaint(table_data, uniqueGenes[0][0]);
        } else {
            if ( JSON.stringify(table_data) !== JSON.stringify(initial_data) ) {
                generateProteinPaint(table_data, uniqueGenes[0][0]);
            }
        }
    } else if (uniqueGenes[1].length > 0 && $("#geneFilter").val()) {
	    if ( $("#geneFilter").val().length == 1 ) {
            if ( ($('#lollipop').filter(':hidden')) & ($('#gene_plot .dimmer').filter(':hidden')) ) {
                generateProteinPaint(table_data, $("#geneFilter").val()[0]);
            } else {
                if ( JSON.stringify(table_data) !== JSON.stringify(initial_data) ) {
                    generateProteinPaint(table_data, $("#geneFilter").val()[0]);
                }
            }
        } else {
            $('#gene_plot').dimmer('hide');
            $('#gene_plot .dimmer').empty();
            document.getElementById('lollipop').style.display = "none";
            document.getElementById('lollipop_placeholder').style.display = "block";
        }
    } else {
        $('#gene_plot').dimmer('hide');
        $('#gene_plot .dimmer').empty();
	    document.getElementById('lollipop').style.display = "none";
        document.getElementById('lollipop_placeholder').style.display = "block";
    }
    // Recall function every 2 seconds with previous data as a comparison
    setTimeout(function() { populateProteinPaint(table_data) }, 2000);
}

function proteinPaintLoad() {
    $("#gene_plot").dimmer('show');
    $('#gene_plot .dimmer').addClass('inverted');
    $('#gene_plot .dimmer').append('<div class="ui text loader">Loading Visualisation</div>');

    var ppLoadCheck = window.setInterval(function(){
        if ($('.sja_skg').length) {
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

makeRequest = async (path, method, body) => {
    let token = '';
    if (localStorage.getItem("splicevardb_token")) {
        token = localStorage.getItem("splicevardb_token");
    } else {
        token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IjBiM2VjYjFjLTVhMDAtMTM4Yi0yYjRjLTdlYjdjZmNhMTA1YiIsImlhdCI6MTUxNjIzOTAyMn0.PByel7nVtTsKJLXIekcN_kbl1eHV0K-eBwq6zee9xTQ'
    }

    return fetch(path, {
        method: method || "GET",
        headers: {
            "Content-Type": "application/json",
            ... (token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : "" ),
    }).then((res) => {
        if (res.status === 401) {
            return false
        } else {
            return res.json();
        }
    });
};

register = async (values) => 
    makeRequest(`${splicevardbAPI}/user/register`, 'POST', values);

login = async (values) =>
    makeRequest(`${splicevardbAPI}/user/login`, 'POST', values);

refresh = async (email) =>
    makeRequest(`${splicevardbAPI}/user/refresh_token?email=${email}`, 'GET', null)

getMyVariant = async (variant_id) =>
    makeRequest(`${splicevardbAPI}/variants/${variant_id}/myvariant`, "GET", null);

getClinvar = async (variant) =>
    makeRequest(`${clinvar}${variant}`, "GET", null);

getValidation = async (variant_id) =>
    makeRequest(`${splicevardbAPI}/variants/${variant_id}`, "GET", null);

getMyGene = async (gene) =>
    makeRequest(`${myGene}${gene}`, "GET", null);

getSpliceAI = async (variant_id) =>
    makeRequest(`${splicevardbAPI}/variants/${variant_id}/spliceai`, "GET", null);

getPangolin = async (variant) =>
    makeRequest(`${pangolinLookup}` + "?hg=37&distance=1000&variant=" + `${variant}`, "GET", null);

getAllGenes = async () =>
    makeRequest(`${splicevardbAPI}/genes/`, "GET", null);

filterVariants = async (payload) =>
    makeRequest(`${splicevardbAPI}/variants/filter`, 'POST', payload)

downloadVariants = async (payload, token) =>
    makeRequest(`${splicevardbAPI}/variants/download`, 'POST', payload)

// Basic API call
function call_api() {
    makeRequest(`${splicevardbAPI}/variants/filter`, 'POST', {
        gene: ['COL4A5']
    })
    .then(function (data) {
        appendData(data.data);
    })
    .catch(function (err) {
        console.log(err);
    });
}

// Add Search Builder
async function makeFilter() {
    $('#DataTables_Table_0_wrapper').prepend('<div id="filters"><button id="filterToggle" class="ui basic button">Launch Custom Filter</button></div>');
    $('#filterToggle').on('click', async function() {
        var allGenes = await getAllGenes();
        var gene_list = allGenes;
        // var gene_list = uniqueGenes[0];
        // comma_genes = uniqueGenes[1];
        var gene_filter = '<div class="filter italic">' +
            '<label>Gene List:</label><select id="geneFilter" class="ui multiple five column search clearable selection dropdown">' +
            '<option value="COL4A5">COL4A5</option>';

        gene_list.forEach(function (gene, index) {
            gene_filter = gene_filter + 
            '<option value="' + gene + '">' + gene + '</option>'
        });
        $('#filters').html(gene_filter + '</select></div>');
        
        var validation_list = uniqueValues(5)[0]; 
        var validation_filter = '<div class="filter">' +
            '<label>Validation Method:</label><select id="valFilter" class="ui multiple search clearable selection dropdown">' +
            '<option value="">Method</option>'
        
        validation_list.forEach(function (validation, index) {
            validation_filter = validation_filter +
                '<option value="' + validation + '">' + validation + '</option>'
        });
        $('#filters').append(validation_filter + '</select></div>');

        var class_list = uniqueValues(6)[0];
        var classification_filter = '<div class="filter">' +
            '<label>Classification:</label><select id="classFilter" class="ui multiple search clearable selection dropdown">' +
            '<option value="">Classification</option>'

        class_list.forEach(function (classification, index) {
            classification_filter = classification_filter +
                '<option value="' + classification + '">' + classification + '</option>'
        });
        $('#filters').append(classification_filter + '</select></div>');

        $('#filters').append('<div class="float right"><button id="removeFilter" class="ui basic button">Reset</button><button id="runFilter" class="ui cci_green button">Filter Results</button></div>');
        $('#runFilter').on('mousedown', function() {
            $('#filters button').addClass('loading');
        });
        $('#runFilter').on('mouseup', function() {
            $('#filters button').removeClass('loading');
            selected_genes=$('#geneFilter').val().filter(g => g !== '');
            selected_val=$('#valFilter').val().filter(v => v !== '');
            selected_class=$('#classFilter').val().filter(c => c !== '');
            if (selected_genes.length !== 0 || selected_val.length !== 0 || selected_class.length !== 0) {
                useFilter(selected_genes, selected_val, selected_class);
            }
        })

        $('#removeFilter').on('mousedown', function() {
            $('#filters button').addClass('loading');
            $('.remove').click();
        });
        $('#removeFilter').on('mouseup', function() {
            $('#filters button').removeClass('loading');
            var table = $('#DataTables_Table_0').DataTable();
            table.searchBuilder.rebuild();
            $('#gene_plot').dimmer('hide');
            $('#gene_plot .dimmer').empty();
            document.getElementById('lollipop').style.display = "none";
            document.getElementById('lollipop_placeholder').style.display = "block";
        })

        $('.ui.dropdown').dropdown();
    });
};

// Run filters
async function useFilter(genes,validations,classifications) {
    const filtered = await filterVariants({
        gene: genes.filter(g => g !== ''),
        classification: classifications.filter(c => c !== ''),
        validation: validations.filter(v => v !== '')
    });
    const newVariants = filtered.data;
    var datatable = $('#DataTables_Table_0').DataTable();
    datatable.clear().draw();
    datatable.rows.add(newVariants); // Add new data
    datatable.columns.adjust().draw(); // Redraw the DataTable
    // populateProteinPaint(fetchTableVariants());
}

// Get unique values from table
function uniqueValues(column, data_type) {
    if (data_type == "filtered") {
        data = fetchTableVariants(column);
    } else {
	    data = fetchVariants(column);
    }

    let list = [];
    let commas = []
    data.forEach(function(entry) {
        if (entry.includes(",")) {
            entry.split(",").forEach(function(split) {
                list.push(split);
                commas.push(split)
            });
        } else {
            list.push(entry);
        }
    });
    let uniqueList = [...new Set(list.sort())];
    let uniqueCommasList = [...new Set(commas.sort())];
    return [uniqueList.sort(), uniqueCommasList.sort()];
}

function jsonToTSV(jsonData) {
    let tsv = '';
    // Get the headers
    let headers = Object.keys(jsonData[0]);
    tsv += headers.join('\t') + '\n';
    // Add the data
    jsonData.forEach(function (row) {
        let data = headers.map(header => JSON.stringify(row[header])).join('\t'); // Add JSON.stringify statement
        tsv += data + '\n';
    });
    return tsv;
}

async function download() {
    const variants = Object.values($('#results table').DataTable().rows( {search:'applied'} ).data()).map(d => `${d.variant_id}`);
    const variantDownload = await downloadVariants({variant_ids: variants});
    const tsvData = jsonToTSV(variantDownload);
    const blob = new Blob([tsvData], { type: 'text/tsv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'splicevardb.download.tsv';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

// Adds passed data into the display table
function appendData(variants) {
    // clear the table
    $('.variants table > tbody').empty();

    var table = $('.variants table').DataTable({
        data: variants,
	    dom: 'QfrtipB',
	    buttons: [
            {
            	filename: 'splicevardb.' + date_tag,
		        extension: '.tsv',
		        fieldSeparator: '\t',
                text: 'Download Variants',
                exportOptions: {
                    modifier: {
                        search: 'none'
                    }
                },
                attr: {
                    id: 'download_all'
                },
            	action: async function ( e, dt, node, config ) {
                    $("#download_all").addClass('loading');
                    if (localStorage.getItem('splicevardb_token')) {
			            await download();
                        $("#download_all").removeClass('loading');
                    } else {
                    	$('#Signin').flyout('show');
                        var awaitTOC = window.setInterval(function(){
                            if ( !$('#Terms').hasClass("visible") ) {
                                if (localStorage.getItem('splicevardb_token')) {
                                    $("#download_all").trigger("click");
                                }
                                $("#download_all").removeClass('loading'); 
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
        columnDefs: [
            {
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
	    // console.log(row)
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

	    formatVariantInfo(row.data(), await getMyVariant(row.data().variant_id));
		
        // let ensembl_id = myVariant_data.cadd.gene[0].gene_id;
        // let myGene_data = await getMyGene(ensembl_id);
	    formatValidation(await getValidation(row.data().variant_id));

        if (localStorage.getItem('splicevardb_token') && parseJwt(localStorage.getItem('splicevardb_token')).sub.spliceai) {
            const spliceai_data = await getSpliceAI(row.data().variant_id);
            // console.log(spliceai_data)
            formatInSilicos(row.data(), spliceai_data);
        } else {
            if (!localStorage.getItem('splicevardb_token')) {
                formatInSilicos(row.data(), null, error='login');
            } else {
                formatInSilicos(row.data(), null, error='permission');
            }
        }
        

        // if (spliceAI_data && pangolin_data) {
	    // 	var spliceAI_score = spliceAI_data.scores[0]
		//     var pangolin_score = pangolin_data.scores[0]
		    
        // } else {
		//     $('.insilico_id' + row.data().variant_id).append('<p>ERROR: No Scores Returned.</p>');
	    // }

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
    igvDiv.style.minHeight = "300px";
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
    if (gene === '') {
        return;
    }
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
	        '</div>'+
        '</div>'
    );
}

function formatVariantInfo(d, myVariant_data) {
    if (myVariant_data.annotation) {
        $('.varinfo_id' + d.variant_id).html(
            '<h5>Variant Information</h5>' +
            '<div class="clinvar-label"></div>' +
            '<div class="ui segment clinvar" style="background-color: ' + myVariant_data.annotation.clinvar_colour + '; margin: 0.5em 0; padding: 0.5em;">' +
            '<h5>' + myVariant_data.annotation.clinvar_sig + '</h5>'+
            (myVariant_data.annotation.clinvar_star_rating == 0 ? '</div>' : '<div class="clinvar-star" style="--rating: ' + myVariant_data.annotation.clinvar_star_rating + ';"></div></div>') +
            (myVariant_data.annotation.rsid ? '<p>rsID: <a href="https://www.ncbi.nlm.nih.gov/snp/' + myVariant_data.annotation.rsid + '" target="_blank">' + myVariant_data.annotation.rsid + '</a></p>' : "" ) +
            '<p>gnomAD Genome AF: ' + myVariant_data.annotation.genome_af + '</p>' +
            '<p>gnomAD Exome AF: ' + myVariant_data.annotation.exome_af + '</p>' +
            '<p>gnomAD Homozygotes: ' + (myVariant_data.annotation.genome_hom + myVariant_data.annotation.exome_hom) + '</p>' +
            '<p>Variant Location: ' + d.location + '</p>' +
            '<p>Consequence: ' + myVariant_data.annotation.consequence + '</p>'
        );
    } else {
        $('.varinfo_id' + d.variant_id).html(
            '<h5>Variant Information</h5>' +
            '<div class="clinvar-label"></div>' +
            '<div class="ui segment clinvar" style="background-color: #FDFDED; margin: 0.5em 0; padding: 0.5em;">' +
            '<h5>Not Present in ClinVar</h5></div>'+
            '<p>gnomAD Genome AF: 0</p>' +
            '<p>gnomAD Exome AF: 0</p>' +
            '<p>gnomAD Homozygotes: 0</p>' +
            '<p>Variant Location: ' + d.location + '</p>' +
            '<p>Consequence: N/A</p>'
        );
    }
}

function formatInSilicos(d, spliceAI_data, error=false) {
    if (!error) {
        if (spliceAI_data.annotation) {
            $('.insilico_id' + d.variant_id).html('<h5>Splicing <i>In Silicos</i>:</h5>' +
                '<p>Introme: ' + d.introme + '</p>' +
                '<p>SpliceAI:</p>' +
                '<ul><li>Acceptor Gain: ' + spliceAI_data.annotation.splice_ai.acceptor_gain + '</li>' +
                '<li>Acceptor Loss: ' + spliceAI_data.annotation.splice_ai.acceptor_loss + '</li>' +
                '<li>Donor Gain: ' + spliceAI_data.annotation.splice_ai.donor_gain + '</li>' +
                '<li>Donor Loss: ' + spliceAI_data.annotation.splice_ai.donor_loss + '</li></ul>' +
                '<p>Pangolin:</p>' +
                '<ul><li>Gain: ' + spliceAI_data.annotation.pangolin.gain + '</li>' +
                '<li>Loss: ' + spliceAI_data.annotation.pangolin.loss + '</li>'
            );
        } else {
            $('.insilico_id' + d.variant_id).html('<h5>Splicing <i>In Silicos</i>:</h5>' +
                '<div class="ui segment clinvar" style="background-color: #FDFDED; margin: 0.5em 0; padding: 0.5em;">' +
                '<h5>Not Present in SpliceAI</h5></div>'
            )
        }
    } else {
        if (error === 'login') {
            $('.insilico_id' + d.variant_id).html('<h5>Splicing <i>In Silicos</i>:</h5>' +
                '<div class="ui segment clinvar" style="background-color: #FDFDED; margin: 0.5em 0; padding: 0.5em;">' +
                '<h5><a id="spliceai_login">Sign in</a> to see <i>In Silicos</i> scores</h5></div>'
            )
            $("#spliceai_login").click(() => {
                $('#Signin').flyout('show');
                $('.ui.dropdown').dropdown();
            })
        } else {
            $('.insilico_id' + d.variant_id).html('<h5>Splicing <i>In Silicos</i>:</h5>' +
                '<div class="ui segment clinvar" style="background-color: #FDFDED; margin: 0.5em 0; padding: 0.5em;">' +
                "<h5>You don't have permission to view SpliceAI In-Silico scores</h5></div>"
            )
        }
    }
}

// Format and append third column in variant expand
// Add entry for each validation attached to that variant ID
function formatValidation(v) {
    if (v.validation) {
        Object.keys(v.validation).map((method, index) => {
            const item = v.validation[method];
            $('.validation_id' + v.variant_id).append(
                '<p>' + method + 
            '<ul><li><a href="https://doi.org/' + item.doi +'" target="_blank">' + item.doi + '</a></p>' +
                (item.tissue ? '<li>Tissue used: ' + item.tissue + '</li>' : "" ) +
                (item.metric1_name ? '<li>' + item.metric1_name + ': ' + item.metric1 + '</li>' : "" ) +
                (item.metric2_name ? '<li>' + item.metric2_name + ': ' + (item.doi == "10.1371/journal.pgen.1009884" ? (item.metric2 == 0 ? "<0.05" : ">=0.05" ) : item.metric2) + '</li>' : "" ) +	    
                '<li>Classification: ' + item.classification + '</li></ul>'
            );
        })
    }
}
