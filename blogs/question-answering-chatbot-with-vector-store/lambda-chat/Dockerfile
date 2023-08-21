FROM amazon/aws-lambda-python:3.11

WORKDIR /var/task/lambda-chat

COPY lambda_function.py /var/task/
COPY test.py /var/task/   
COPY . ..

RUN /var/lang/bin/python3.11 -m pip install --upgrade pip

RUN /var/lang/bin/python3 -m pip install PyPDF2
RUN /var/lang/bin/python3 -m pip install langchain
RUN /var/lang/bin/python3 -m pip install faiss-cpu
RUN /var/lang/bin/python3 -m pip install opensearch-py

RUN pip install -U /var/task/bedrock-sdk/boto3-1.28.21-py3-none-any.whl
RUN pip install -U /var/task/bedrock-sdk/botocore-1.31.21-py3-none-any.whl 
RUN rm -rf /var/task/bedrock-sdk

CMD ["lambda_function.lambda_handler"]