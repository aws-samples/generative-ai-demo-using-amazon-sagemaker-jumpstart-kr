const aws = require('aws-sdk');
const domainName = process.env.domainName;
/*const msg = `This image was created by Stable Diffusion v2-1 base from SageMaker JumpStart for demonstration purposes.
This model is available under the CreativeML Open RAIL++-M license: <a href="https://huggingface.co/stabilityai/stable-diffusion-2/blob/main/LICENSE-MODEL">License</a>. This is a text-to-image model from <a href="https://stability.ai/blog/stable-diffusion-public-release">Stability AI</a> and downloaded from <a href="https://huggingface.co/stabilityai/stable-diffusion-2-1-base">HuggingFace</a>. It takes a textual description as input and returns a generated image from the description.`;*/
const msg1 = `Created by Stable Diffusion v2-1 base from SageMaker JumpStart for demonstration purposes under the CreativeML Open RAIL++-M license: <a href="https://huggingface.co/stabilityai/stable-diffusion-2/blob/main/LICENSE-MODEL">License</a>.`;
const msg2 = `The model is from <a href="https://stability.ai/blog/stable-diffusion-public-release">Stability AI</a> downloaded from <a href="https://huggingface.co/stabilityai/stable-diffusion-2-1-base">HuggingFace</a>.`;

exports.handler = async (event, context) => {
    console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    console.log('## EVENT: ' + JSON.stringify(event));
    
    let contentName = event['queryStringParameters'].content;
    console.log('content: ' + contentName);

    let url = `https://${domainName}/${contentName}`;
    // let html = `<html><body><meta charset="UTF-8"><center><h2>AWS Seoul Summit 2023: My Emotion Gardens</h2><img src=`+url+`></center><a style-"font-size:1">`+msg1+`</p<a style-"font-size:1>`+msg2+`</p></body></html>`;
    
    let html = `<html>
    <head>
        <title>AWS Summit Seoul | My Emotion Gardens</title>
        <meta http-equiv="content-type" content="text/html; charset=UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
        <meta content="width=device-width, minimal-ui, initial-scale=1.0, maximum-scale=1.0, user-scalable=0;" name="viewport">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
    </head>
    <body>
        <div style="background-color:#131958; background:#131958;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin:0 auto;width:100%;max-width:100%;border-collapse: collapse;" border="0" align="center">
                <tbody>
                    <tr>
                        <td valign="top" style="text-align: center;">
                            <img src="https://d2xyhyozo1nnqt.cloudfront.net/2023_Summits_Commercial_EmailHeader_Seoul2.jpg" alt="AWS Summit Seoul" style="width: 100%;" constrain="true" imagepreview="false">
                        </td>
                    </tr>
                </tbody>
            </table>
            
            <table width="100%" cellpadding="0" cellspacing="0" style="border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin:0 auto;width:100%;max-width:100%;border-collapse: collapse;" border="0" align="center">
                <tbody>
                    <tr>
                        <td>
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin:0 auto;width:100%;max-width:100%;border-collapse: collapse;" border="0" align="center">
                                <tbody>
                                    <tr>
                                        <td height="30" style="line-height:1px;font-size:1px;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td valign="top" style="vertical-align:top;color:#ffffff;font-size:32px;line-height:1.2;text-align:left;font-family: &#39;AmazonEmber-Heavy&#39;,arial, Helvetica, sans-serif;font-weight:900;">
                                            <div>
                                                <div style="word-break: keep-all; font-size: 34px; mso-line-height: exactly; line-height: 40px; font-family: &#39;맑은 고딕&#39;,&#39; 돋움&#39;,&#39; 굴림&#39;, arial, Helvetica, sans-serif;">AWS Summit Seoul 2023에 참석해 주셔서 감사합니다.</div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td height="10" style="line-height:1px;font-size:1px;">&nbsp;</td>
                                    </tr>
                                </tbody>
                            </table>
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin:0 auto;width:100%;max-width:100%;border-collapse: collapse;" border="0" align="center">
                                <tbody>
                                    <tr>
                                        <td>
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin:0 auto;width:100%;max-width:100%;border-collapse: collapse;" border="0" align="center">
                                                <tbody>
                                                    <tr>
                                                        <td height="15" style="line-height:1px;font-size:1px;">&nbsp;</td>
                                                    </tr>
                                                    <tr>
                                                        <td valign="top" style="vertical-align:top;color:#ffffff;font-size:16px;line-height:1.5;text-align:left;font-family: AmazonEmber,arial, Helvetica, sans-serif;font-weight:normal;">
                                                            <div>
                                                                <div>
                                                                    참여하신 행사(My Emotion Gardens)를 통해서 발급된 이미지는 아래와 같습니다.
                              <br>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td height="15" style="line-height:1px;font-size:1px;">&nbsp;</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin:0 auto;width:100%;max-width:100%;border-collapse: collapse;" border="0" align="center">
                                <tbody>
                                    <tr>
                                        <td height="15" style="line-height:1px;font-size:1px;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td valign="top" style="vertical-align:top;color:#ffffff;font-size:16px;line-height:1.5;text-align:left;font-family: AmazonEmber,arial, Helvetica, sans-serif;font-weight:normal;">
                                            <img src='${url}' border="0" style="font-family: Helvetica, arial, sans-serif; font-size: 16px; width: 100%;" constrain="true" imagepreview="false" >
                                        </td>
                                    </tr>
                                    <tr>
                                        <td height="15" style="line-height:1px;font-size:1px;">&nbsp;</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin:0 auto;width:100%;max-width:100%;border-collapse: collapse;" border="0" align="center">
                <tbody>
                    <tr>
                        <td>
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin:0 auto;width:100%;max-width:100%;border-collapse: collapse;" border="0" align="center">
                                <tbody>
                                    <tr>
                                        <td height="15" style="line-height:1px;font-size:1px;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td valign="top" style="vertical-align:top;color:#ffffff;font-size:16px;line-height:1.5;text-align:left;font-family: AmazonEmber,arial, Helvetica, sans-serif;font-weight:normal;">
                                            <div>
                                                <div>
                                                    - Created by Stable Diffusion v2-1 base from SageMaker JumpStart for demonstration purposes under the CreativeML Open RAIL++-M license: <a href='https://huggingface.co/stabilityai/stable-diffusion-2/blob/main/LICENSE-MODEL'>License</a>
                                                    .
                      <br>
                                                    - The model is from <a href='https://stability.ai/blog/stable-diffusion-public-release'>Stability AI</a>
                                                    downloaded from <a href='https://huggingface.co/stabilityai/stable-diffusion-2-1-base'>HuggingFace</a>
                                                    .
                      <br>
                                                    <br>
                                                    <br>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td height="15" style="line-height:1px;font-size:1px;">&nbsp;</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin:0 auto;width:100%;max-width:100%;border-collapse: collapse;" border="0" align="center">
                <tbody>
                    <tr>
                        <td align="center" background-color:="#ffffff">
                            <a href="https://email.awscloud.com/n/MTEyLVRaTS03NjYAAAGLZbAW7Hmq7ounAZZVYm83fPw4ezsxIrM-Zja-2sZvrXdOjhlKp5Gu-5frZfi9zNsjAqu8FGY=" target="_blank">
                                <img src="https://d2xyhyozo1nnqt.cloudfront.net/ba-apj-freetier-ko-2022.jpg" border="0" alt="Start Building on AWS Today" style="font-family: Helvetica, arial, sans-serif; font-size: 16px; max-width: 100%; width: 100%;" constrain="true" imagepreview="false">
                            </a>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div>
                <table width="100%" cellpadding="10" cellspacing="0" border="0">
                    <tbody>
                        <tr>
                            <td align="center" style="font-family: Helvetica, Arial, Sans-serif; font-size: 10px; line-height: 14px; color: #999999; padding-top: 10px;">
                                <a style="color: #44B0D6; text-decoration: none;" href="https://email.awscloud.com/MTEyLVRaTS03NjYAAAGLZbAW7VSZN9Pqqj4A7dLh2IXtxX8oiMH0vC1GzQxQDaf40mZ2DGuKvXeJKKSQ0-41ukhZ_6U=" target="_blank">AWS on Twitter</a>
                                <span style="color: #999999 !important;">|</span>
                                <a style="color: #44B0D6; text-decoration: none;" href="https://email.awscloud.com/MTEyLVRaTS03NjYAAAGLZbAW7AZmpoRd8m8HzpKq03Q_9zFQqoOkpNOI2uDnLfyx8GV0BD5Rhg2ROP2dvXvXxe2f-vU=" target="_blank">AWS on Facebook </a>
                                <span style="color: #999999 !important;">|</span>
                                <a style="color: #44B0D6; text-decoration: none;" href="https://email.awscloud.com/MTEyLVRaTS03NjYAAAGLZbAW7OcHZnwoZwhORo6pCLdY1UGWCWV5Xbc3Pa0OHc8wQg-FEuWpSl0TS1qJhmscRqzHreo=" target="_blank">AWS on Twitch </a>
                                <span style="color: #999999 !important;">|</span>
                                <a style="color: #44B0D6; text-decoration: none;" href="https://email.awscloud.com/MTEyLVRaTS03NjYAAAGLZbAW7JLWPQfenomYpe_POuKqypnbcn9OczDYqO2JfxiCVV4p9HLqda95xayZaPxI4zw8zYQ=" target="_blank">AWS Blog </a>
                                <span style="color: #999999 !important;">|</span>
                                <a style="color: #44B0D6; text-decoration: none;" href="https://email.awscloud.com/MTEyLVRaTS03NjYAAAGLZbAW7XP3O4bzJYPMJIS48rKmrlEIe-RhWyVXY50WWzI4YYwW02f8fbTrBG8_tiFlknSW2yo=" target="_blank">AWS TechChat</a>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tbody>
                        <tr>
                            <td style="padding: 10px 0px 10px 0px; border-top: 1px solid #e8e8e8;">
                                <table align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                                    <tbody>
                                        <tr>
                                            <td align="center">
                                                <table align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                                                    <tbody>
                                                        <tr>
                                                            <td align="center" style="font-family: Helvetica, Arial, Sans-serif; font-size: 9px; color: #999999; line-height: 16px;">
                                                                <span class="font-family-decor" style="font-size: 9px; color: #999999; line-height: 16px;">
                                                                    <a href="https://email.awscloud.com/dc/yuZkfPEXXFT65tdReNucEvTRm1nqq5Eg9ByfCCxPZLBhFWAGCfvufj6dhVwTzEtOasrcf9ckHqL3Z8qatnWSsPW5AX4oV4DHhgrDYnOM1v7r8jMR8AfBLz47cnpRR4Wt4Dd8cdS0auKfwo9BZ61Q8Z0FIfZfqa4YuHaXcWO9An37nfCmxMZndrOmWjkTRpw6NkcnOQ1miuDwZdwSX0-XvA==/MTEyLVRaTS03NjYAAAGLZbAW7XZhPyA0jDl7918IDaevLJc8z8mEQdT2heT9jQpc7qV0aFjRziwrJxVgzdDuAOxf5Ac=" style="color: #44B0D6; text-decoration: none;" target="_blank">내 계정 </a>
                                                                    | <a href="https://email.awscloud.com/dc/KwqiTCOQ16Q1JCi3MdelD0RiGRbdViv4dtKj-dNNSIz_ClBOlUhrS1DqkEeoy9OWvLpP9e59kHQisS3zo5OeM5NHm52a7hKghn-haWRCBbf_Ii1Iz31xMe8XhrMvLfHfnozF19mV1KL60hN6mWfNBRtqLBe9UCuSOM21omjYvjDZickb6vqL0dB0RqrfnRMXmRDf8Dx1OKHbacVzszKnU9LWwJ3UD-PYSPWdiffVCDI=/MTEyLVRaTS03NjYAAAGLZbAW7XZhPyA0jDl7918IDaevLJc8z8mEQdT2heT9jQpc7qV0aFjRziwrJxVgzdDuAOxf5Ac=" style="color: #44B0D6; text-decoration: none;" target="_blank">시작하기</a>
                                                                    | <a href="https://email.awscloud.com/dc/ajD_BapU74vzOhWVQvr7p4cqVisGqB1O6HX4o5TDTFPHjYjB0mnTCzeqU2ae_UKuUXkVmx6YfKWUwCevuvXnlwdztyYpbIP26RewhkXl7O6uVrL092UPwLV7jyRNXkaVLzi7gjCbUkraASzjCwfcLtvDl1b4e7t35wROz58Z2w0DiIuzYb9lHPsQRbfsrx5JIPwG7Yj-D70wQMu1M2Fxtw==/MTEyLVRaTS03NjYAAAGLZbAW7XZhPyA0jDl7918IDaevLJc8z8mEQdT2heT9jQpc7qV0aFjRziwrJxVgzdDuAOxf5Ac=" style="color: #44B0D6; text-decoration: none;" target="_blank">제품</a>
                                                                    | <a href="https://email.awscloud.com/MTEyLVRaTS03NjYAAAGLZbAW7VoiTm9Ml9c8OyD9QdXC3ao9Yewws-LOlSc-GrxRAoBDxE2Dn4Hku9zYOcNMaG8CoHs=" style="color: #44B0D6; text-decoration: none;" target="_blank">솔루션</a>
                                                                    | <a href="https://email.awscloud.com/dc/ajD_BapU74vzOhWVQvr7p2cy1ELLlkvByqWei9bfR--hojGlhPzUN78r_Zch2Htb0xu7shDsTT58LWSTVv2_fPF9ZcsO0bRV-vhuwEoei2eqKueCVsUNLj0iwnEWNrWNxIEROLlb7nqlJHx0qqTmLeg_ib22i1wcTSgggYaWOImSgtDlPydp7oqIzwRwkwfwzkZM_3hRo1Qt4BahD81Edg==/MTEyLVRaTS03NjYAAAGLZbAW7XZhPyA0jDl7918IDaevLJc8z8mEQdT2heT9jQpc7qV0aFjRziwrJxVgzdDuAOxf5Ac=" style="color: #44B0D6; text-decoration: none;" target="_blank">요금</a>
                                                                    | <a href="https://email.awscloud.com/dc/KwqiTCOQ16Q1JCi3MdelD5jQ51lhLdWIOW7AEKXGYGWzO8RxS8ERjQz7iafka05SHdt8jDOpC2Wck79EQWNmre6z4jUHyUY02ss_377HrQ0CnrjW5OaRpGaWV_Z84jv_1jNXg613jYQOrhQwfGSC6qn61zOW8u_Tcq1nviLMJVFh2W_jtAcQu8VnmyygHYGGBnLBIXbQ0ri5cKbhyZS3qwE4ykERc4FSSDHsvhNKDhs=/MTEyLVRaTS03NjYAAAGLZbAW7XZhPyA0jDl7918IDaevLJc8z8mEQdT2heT9jQpc7qV0aFjRziwrJxVgzdDuAOxf5Ac=" style="color: #44B0D6; text-decoration: none;" target="_blank">파트너</a>
                                                                    | <a href="https://email.awscloud.com/MTEyLVRaTS03NjYAAAGLZbAW7dD3ZnXJVeqmgNtsHy9udP4R8GW6hyNRKjjhiss8RiAI39wqmQuOkDj8xDb0-NWF2lQ=" style="color: #44B0D6; text-decoration: none;" target="_blank">&nbsp;설명서</a>
                                                                    | <a href="https://email.awscloud.com/MTEyLVRaTS03NjYAAAGLZbAW7Wi4Uc7L_CCsQxCMGNCHd5gAsxkBi2418uw_bUQ-KzsUrBJwueXLu6i46tqUnYQzTGk=" style="color: #44B0D6; text-decoration: none;" target="_blank">교육</a>
                                                                    | <a href="https://email.awscloud.com/dc/ajD_BapU74vzOhWVQvr7p9MwfMxNMOCe_0VHXzfN8dN-Pg8LCpQSQaN0TBrjXosT8IVHM7g9SjZ9JhEtgldhBaAhvX_SFMMLZva218aMq86HfAjZbe1E7tRIHW_nZym73OPkBWvE9KbhsIz2G-T36L7PZRR3LVUyNHQUdMLEZiY6ZpYPJZILAl7dWPd1BL2CohPAHjIvyr1KobSJW63OlKwetbF8cpsvtXrx90MHAjc=/MTEyLVRaTS03NjYAAAGLZbAW7XZhPyA0jDl7918IDaevLJc8z8mEQdT2heT9jQpc7qV0aFjRziwrJxVgzdDuAOxf5Ac=" style="color: #44B0D6; text-decoration: none;" target="_blank">이벤트 및 웨비나</a>
                                                                    | <a href="https://email.awscloud.com/dc/ajD_BapU74vzOhWVQvr7p_6kJwt0TTW5-lUgzrRRksWwNnZYFu3dhhhur2StMVZQFg1cUIitrT8WWDwBZaIYh2aVzRU1e622FiEnFCgCCTnEj_0Y5-xJ8kgstA9v-X8f5gNN1mF4eLKOiFqBrSvCiPo7o_y5A5QrZTYuW0It6Ob5pPY7qrHbP6XKovs_sBspVnOecBFar5d_V8Fba6pIOp5BA36iaGuiUFxNETiXagw=/MTEyLVRaTS03NjYAAAGLZbAW7XZhPyA0jDl7918IDaevLJc8z8mEQdT2heT9jQpc7qV0aFjRziwrJxVgzdDuAOxf5Ac=" style="color: #44B0D6; text-decoration: none;" target="_blank">AWS Activate</a>
                                                                    | <a href="https://email.awscloud.com/dc/KwqiTCOQ16Q1JCi3MdelD3HrrSLktu-DuvC8JV2JEFuj1EpShuCQ76i5hvh7SsnYNUEVkt_wlb_3ADG1auTgNBbF0MHFaClxPQpfoiXQ_ayO0hgSHRRAq7GWvLqBX6caekdRmW9fPaumOMtmz7H_ZriTdf0vNwsEheT1mmv4P0eSaUigcCn_YSA5hlrMCWkjHOCgUwet9RgEVAwBq9uOMD2vucbzkDL_IboKrenLXZ75KinTgL0-ZGPQ-KkqNN0hG5CZxVUDzG6de4sRBr_7__hfDvMre_duEr032w6-mTI=/MTEyLVRaTS03NjYAAAGLZbAW7XZhPyA0jDl7918IDaevLJc8z8mEQdT2heT9jQpc7qV0aFjRziwrJxVgzdDuAOxf5Ac=" style="color: #44B0D6; text-decoration: none;" target="_blank">새 소식</a>
                                                                    | <a href="https://email.awscloud.com/dc/KwqiTCOQ16Q1JCi3MdelD3HrrSLktu-DuvC8JV2JEFuj1EpShuCQ76i5hvh7SsnYNUEVkt_wlb_3ADG1auTgNBbF0MHFaClxPQpfoiXQ_ayO0hgSHRRAq7GWvLqBX6caekdRmW9fPaumOMtmz7H_ZriTdf0vNwsEheT1mmv4P0eSaUigcCn_YSA5hlrMCWkjHOCgUwet9RgEVAwBq9uOMD2vucbzkDL_IboKrenLXZ75KinTgL0-ZGPQ-KkqNN0hG5CZxVUDzG6de4sRBr_7__hfDvMre_duEr032w6-mTI=/MTEyLVRaTS03NjYAAAGLZbAW7XZhPyA0jDl7918IDaevLJc8z8mEQdT2heT9jQpc7qV0aFjRziwrJxVgzdDuAOxf5Ac=" style="color: #44B0D6; text-decoration: none;" target="_blank">블로그</a>
                                                                    | <a href="https://email.awscloud.com/dc/KwqiTCOQ16Q1JCi3MdelD3HrrSLktu-DuvC8JV2JEFuj1EpShuCQ76i5hvh7SsnYNUEVkt_wlb_3ADG1auTgNBbF0MHFaClxPQpfoiXQ_ayO0hgSHRRAq7GWvLqBX6caekdRmW9fPaumOMtmz7H_ZriTdf0vNwsEheT1mmv4P0eSaUigcCn_YSA5hlrMCWkjHOCgUwet9RgEVAwBq9uOMD2vucbzkDL_IboKrenLXZ75KinTgL0-ZGPQ-KkqNN0hG5CZxVUDzG6de4sRBr_7__hfDvMre_duEr032w6-mTI=/MTEyLVRaTS03NjYAAAGLZbAW7XZhPyA0jDl7918IDaevLJc8z8mEQdT2heT9jQpc7qV0aFjRziwrJxVgzdDuAOxf5Ac=" target="_blank" style="color: #44B0D6; text-decoration: none;">애널리스트 보고서</a>
                                                                </span>
                                                                <br>
                                                                <br>
                                                                <span style="font-size: 11px;"></span>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
    </body>
</html>`
    console.log('html: ' + html);

    let response = {
        statusCode: 200,
        headers: {
            'Content-Type': 'text/html',
        },
        body: html
    };
    console.debug('response: ', JSON.stringify(response));

    return response;
};

