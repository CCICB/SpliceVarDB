const apiURL = 'http://127.0.0.1:5000/splicevardb/variants'
const myVariant = 'http://myvariant.info/v1/variant/'
const clinvar = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&retmode=json&id="
const myGene = "http://mygene.info/v3/gene/"
const spliceAILookup = "https://spliceailookup-api.broadinstitute.org/spliceai/"
const pangolinLookup = "https://spliceailookup-api.broadinstitute.org/pangolin/"

// Display all variants with basic api call
// Hide gene-level view on initial load
$( document ).ready(function() {
    call_api();
    document.getElementById('lollipop').style.display = "none";
    document.getElementById('lollipop_loader').style.display = "none";
});

function fetchTableVariants() {
    var table = $('#results table').DataTable();
    var data = table.rows({search:'applied'}).data().toArray();
    return data;
}

function populate(initial_data) {
    data = fetchTableVariants();

    let displayed_genes = []
    data.forEach(function (item, index) {
        displayed_genes.push(item.gene_symbol);
    });

    // Runs ProteinPaint if only one gene is left from filtering
    let uniqueGenes = [...new Set(displayed_genes)];
    if (uniqueGenes.length == 1) {
        if (document.getElementById('lollipop').style.display == "none") {
            generateProteinPaint(data, uniqueGenes[0]);
        } else {
            if ( JSON.stringify(data) !== JSON.stringify(initial_data) ) {
                generateProteinPaint(data, uniqueGenes[0]);
            }
        }
    } else {
        document.getElementById('lollipop').style.display = "none";
        document.getElementById('lollipop_placeholder').style.display = "block";
    }
    // Recall function every 2 seconds with previous data as a comparison
    setTimeout(function() { populate(data) }, 2000);
}

function proteinPaintLoad() {
    document.getElementById('lollipop').style.display = "block";
    if (document.getElementsByClassName('sja_skg').length > 0) {
        document.getElementById('lollipop_loader').style.display = "none";
        document.getElementsByClassName('sja_Block_div').item(0).children.item(3).style.display = "none";
    } else {
        setTimeout(proteinPaintLoad, 15);
        document.getElementById('lollipop_loader').style.display = "block";
    }
}

// API call from Alan
makeRequest = async (path) => {
    return fetch(path, {
        method: "GET",
    }).then((res) => {
        if (res.status === 401) {
            return false
        } else {
            return res.json();
        }
    });
};

getMyVariant = async (variant) =>
    makeRequest(`${myVariant}${variant}`);

getClinvar = async (variant) =>
    makeRequest(`${clinvar}${variant}`);

getMyGene = async (gene) =>
    makeRequest(`${myGene}${gene}`);

getSpliceAI = async (variant) =>
    makeRequest(`${spliceAILookup}` + "?hg=37&distance=1000&variant=" + `${variant}`);

getPangolin = async (variant) =>
    makeRequest(`${pangolinLookup}` + "?hg=37&distance=1000&variant=" + `${variant}`);

// Basic API call
function call_api() {
    fetch(apiURL)
      .then(function (response) {
          return response.json();
      })
      .then(function (data) {
          appendData(data);
          populate();
      })
      .catch(function (err) {
          console.log(err);
    });
    results_sentence.innerText = "Displaying variants";
}

// Adds passed data into the display table
function appendData(variants) {
    // clear the table
    $('.variants table > tbody').empty();
    var table = $('.variants table').DataTable({
        data: variants,
        searchBuilder: {
            columns: [2,4,5]
        },
        dom: 'Qfrtip',
        columns: [
                {
                    className: 'dt-control',
                    orderable: false,
                    data: null,
                    defaultContent: '',
                },
                { data: 'chr' },
                { data: 'gene_symbol' },
                { data: 'HGVS' },
                { data: 'validation'},
                { data: 'classification'},
            ],
            columnDefs: [{
                "targets": [ 1 ],
                "render": function( data, type, row) {
                    return data +'-'+ row.pos_hg19 +'-'+ row.ref +'-'+ row.alt;
                },
            }]
        });

        $('tbody').on('click', 'td.dt-control', async function () {
        var tr = $(this).closest('tr');
        var row = table.row(tr);

        if (row.child.isShown()) {
            // This row is already open - close it
            row.child.hide();
            tr.removeClass('shown');
        } else {
            // Open this row
            let myVariant_format = "chr" + row.data().chr + ":g." + row.data().pos_hg19 + row.data().ref + ">" + row.data().alt;
            let myVariant_data = await getMyVariant(myVariant_format);

            let clinvar_id = myVariant_data.clinvar.variant_id;
            let clinvar_data = await getClinvar(clinvar_id);

            let ensembl_id = myVariant_data.cadd.gene.gene_id;
            let myGene_data = await getMyGene(ensembl_id);

            let broadLookup_format = "chr" + row.data().chr + "-" + row.data().pos_hg19 + "-" + row.data().ref + "-" + row.data().alt;
            let spliceAI_data = await getSpliceAI(broadLookup_format);
            let spliceAI_score = spliceAI_data.scores[0].split("|").slice(1, 9)
            let pangolin_data = await getPangolin(broadLookup_format);
            let pangolin_score = pangolin_data.scores[0].split("|").slice(1, 5)

            row.child(formatChild(row.data(), myVariant_data, clinvar_data.result[myVariant_data.clinvar.variant_id], myGene_data, spliceAI_score, pangolin_score)).show();
            tr.addClass('shown');

            var igvDiv = row.child().find(".variant-visualisation")[0];
            if ( row.data().classifier == "Splice-altering" ) {
                var color = "rgba(219, 61, 61,0.5)";
            } else if ( row.data().classifier == "Low-frequency" ) {
                var color = "rgba(160, 32, 240, 0.5)";
            } else if ( row.data().classifier == "Normal" ) {
                var color = "rgba(57, 135, 204, 0.5)";
            } else {
                var color = "rgba(140,140,140, 0.5)";
            }
            var options =
            {
                genome: "hg19",
                locus: "chr" + row.data().chr + ':' + (row.data().pos_hg19 - 200) + "-" + (row.data().pos_hg19 - -200),
                roi: [
                    {
                        name: "Variant",
                        color: color,
                        features: [
                            {
                                chr: "chr" + row.data().chr,
                                start: row.data().pos_hg19 - 1,
                                end: row.data().pos_hg19,
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
                        url: "https://raw.githubusercontent.com/CCICB/introme/master/annotations/U12.hg19.bed.gz",
                        displayMode: "EXPANDED",
                        color: "#ff0000",
                    },
                    {
                        name: "Branchpoints",
                        type: "annotation",
                        format: "bed",
                        url: "https://raw.githubusercontent.com/CCICB/introme/master/annotations/branchpointer.hg19.bed.gz",
                        displayMode: "EXPANDED",
                        color: "#ff0000",
                    }
                ]
            };
            igv.createBrowser(igvDiv, options)
        }
    });
};


// proteinPaint Plot
function generateProteinPaint(data, gene) {
    document.getElementById('lollipop_placeholder').style.display = "none";
    $('#lollipop').empty();
    proteinPaintLoad()
    let proteinPaintData = convert_to_protein_paint(data);
    runproteinpaint({
         noheader:1,
         holder: document.getElementById('lollipop'),
         parseurl:true,
         nobox:1,
         genome:'hg19',
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
        // Extract the first letter of the classification to use for the class
        let classifier = variant.classification.charAt(0);
        plot_item = {
            'dt': 1,
            'isoform': "NM_007294",
            'chr': "chr" + variant.chr,
            'pos': Number(variant.pos_hg19),
            'ref': variant.ref,
            'alt': variant.alt,
            'class': classifier,
            'mname': variant.HGVS
        }
        result.push(plot_item);
    });
    return result;
}

function formatChild(d, myVariant_data, clinvar_data, myGene_data, spliceAI, pangolin) {
    console.log(d);
    console.log(myVariant_data);
    console.log(clinvar_data);
    console.log(myGene_data);

    let clinvar_sig = clinvar_data.clinical_significance.description;
    if (clinvar_sig == "Pathogenic" || clinvar_sig == "Likely pathogenic" || clinvar_sig == "Pathogenic/Likely pathogenic" ) {
        clinvar_colour = "#FFEFEF";
    } else if (clinvar_sig == "Benign" || clinvar_sig == "Likely benign" || clinvar_sig == "Benign/Likely benign") {
        clinvar_colour = "#EAF8ED";
    } else if (clinvar_sig == "Uncertain significance") {
        clinvar_colour = "#EDFAFD";
    } else {
        clinvar_colour = "FDFDED";
    }

    let clinvar_review_status = clinvar_data.clinical_significance.review_status;
    if (clinvar_review_status == "practice guideline") {
        var clinvar_star_rating = 4;
    } else if (clinvar_review_status == "reviewed by expert panel") {
        var clinvar_star_rating = 3;
    } else if (clinvar_review_status == "criteria provided, multiple submitters, no conflicts") {
        var clinvar_star_rating = 2;
    } else if (clinvar_review_status == "criteria provided, conflicting interpretations" || clinvar_sig == "criteria provided, single submitter" ) {
        var clinvar_star_rating = 1;
    } else {
        var clinvar_star_rating = 0;
    }

    return (
        '<div class="columns">' +
        '<div class="column">' +
        '<div class="clinvar-label"></div>' +
        '<div class="clinvar" style="background-color: ' + clinvar_colour + ';">' +
            '<h5>' + clinvar_sig + '</h5>'+
            '<div class="clinvar-star" style="--rating: ' + clinvar_star_rating + ';"></div></div>' +
        '<p>rsID: <a href="https://www.ncbi.nlm.nih.gov/snp/' + myVariant_data.dbsnp.rsid + '" target="_blank">' + myVariant_data.dbsnp.rsid + '</a>.</p>' +
        '<p>gnomAD Exome AF: ' + myVariant_data.gnomad_exome.af.af + '.</p>' +
        '<p>gnomAD Homozygotes: ' + myVariant_data.gnomad_exome.hom.hom + '.</p>' +
        '<p>Variant location: ' + d.location + '.</p>' +
        '<p>Intron spliced by: ' + d.intronType + '.</p>' +
        '<p>Splicing regions: ' + d.region + '.</p></div>' +

        '<div class="column">' +
        '<p><b>Splicing <i>In silicos</i></b>:</p>' +
        '<p>Introme: ' + d.introme + '.</p>' +
        '<p>SpliceAI:</p>' +
        '<ul><li>Acceptor Gain: ' + spliceAI[0] + ' @ ' + spliceAI[4] + '.</li>' +
        '<li>Acceptor Loss: ' + spliceAI[1] + ' @ ' + spliceAI[5] + '.</li>' +
        '<li>Donor Gain: ' + spliceAI[2] + ' @ ' + spliceAI[6] + '.</li>' +
        '<li>Donor Loss: ' + spliceAI[3] + ' @ ' + spliceAI[7] + '.</li></ul>' +
        '<p>Pangolin:</p>' +
        '<ul><li>Gain: ' + pangolin[0] + ' @ ' + pangolin[2] + '.</li>' +
        '<li>Loss: ' + pangolin[1] + ' @ ' + pangolin[3] + '.</li></div>' +

        '<div class="column"><h5>Validation details</h5>' +
        '<p>Outcome(s) reported: ' + d.outcome + '.</p>' +
        '<p>Splicing motif affected: ' + d.category + '.</p>' +
        '<p>Validated using ' + d.validation + ' (<a href="www.doi.org/' + d.doi +'" target="_blank">' + d.doi + '</a>).</p>' +
        '<p>Tissue used: ' + d.tissue + '.</p>' +
        '<p>Number of supporting reads: ' + d.evidence + '.</p></div>' +
        '</div>' +

        '<div class="variant-visualisation" id="igv-div">' +
        '<div class="intron"></div>' +
        '<div class="exon"></div>' +
        '<div class="intron"></div>' +
        '</div>'
    );
}
