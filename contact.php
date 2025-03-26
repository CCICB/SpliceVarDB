<?php
    if(isset($_POST['submit'])){
        $name = $_POST['name'];
        $email = $_POST['email'];
        $affiliation = $_POST['affiliation'];
	$field = $_POST['field'];
	$size = $_POST['size'];
        $role = $_POST['role'];
        $purpose = $_POST['purpose_commercial'];
        $spliceai = 'no';
        if ($_POST['spliceai'] == 'on') {
            $spliceai = 'yes';
        }
        $to = 'psullivan@ccia.org.au';
        $headers = "From: $email \r\n";

        $email_start = "SpliceVarDB commercial access request received.";

        $email_body = "$email_start\n".
                "Name: $name\n".
		"Email: $email\n".
                "Affiliation: $affiliation\n".
                "Organisation type: $field\n".
		"Company size: $size\n".
		"Role: $role\n".
                "Has SpliceAI permission: $spliceai\n".
                "Purpose for access: $purpose\n";

        mail($to,'SpliceVarDB Access Request for Commercial User',$email_body,$headers);
    }
    header('Location: http://compbio.ccia.org.au/splicevardb')
?>
