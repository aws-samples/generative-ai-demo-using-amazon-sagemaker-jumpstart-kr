# lambda base image (python)
FROM amazon/aws-lambda-python:3.8

RUN /var/lang/bin/python3.8 -m pip install --upgrade pip
RUN /var/lang/bin/python3.8 -m pip install PyPDF2
RUN /var/lang/bin/python3.8 -m pip install langchain
RUN /var/lang/bin/python3 -m pip install faiss-cpu
RUN /var/lang/bin/python3 -m pip install opensearch-py

WORKDIR /var/task/lambda-chat

COPY lambda_function.py /var/task/
COPY . .

CMD ["lambda_function.lambda_handler"]