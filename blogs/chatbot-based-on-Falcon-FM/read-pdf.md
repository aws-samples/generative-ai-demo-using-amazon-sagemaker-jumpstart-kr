# PDF에서 Text 추출

[Extract Text from a PDF](https://pypdf.readthedocs.io/en/stable/user/extract-text.html)를 참조하여 아래와 같이 pdf파일에서 Text 추출합니다.

```python
from pypdf import PdfReader

reader = PdfReader("example.pdf")
page = reader.pages[0]
print(page.extract_text())

# extract only text oriented up
print(page.extract_text(0))

# extract text oriented up and turned left
print(page.extract_text((0, 90)))
```


[pypdf2](https://pypdf2.readthedocs.io/_/downloads/en/latest/pdf/)에 따라 아래와 같이 S3로부터 pdf 파일을 읽을 수 있습니다.

```python
from io import BytesIO
import boto3
from PyPDF2 import PdfReader
s3 = boto3.client("s3")
obj = s3.get_object(Body=csv_buffer.getvalue(), Bucket="my-bucket", Key="my/doc.pdf")
reader = PdfReader(BytesIO(obj["Body"].read()))
```



## Reference 

[How to read PDF from S3 on Lambda trigger](https://medium.com/srcecde/how-to-read-pdf-from-s3-on-lambda-trigger-b9e27c488deb)
