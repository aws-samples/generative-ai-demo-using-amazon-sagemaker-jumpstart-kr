import json
import boto3
import os
import time
from multiprocessing import Process
from io import BytesIO

def query_endpoint(payload, endpoint_name):
    client = boto3.client('runtime.sagemaker')
    response = client.invoke_endpoint(
        EndpointName=endpoint_name, 
        ContentType='application/json', 
        Body=json.dumps(payload).encode('utf-8'))                
    print('response:', response)
        
    response_payload = json.loads(response['Body'].read())
    print('response_payload:', response_payload)

    generated_text = response_payload[0]['generated_text']

    if generated_text == '':
        generated_text = 'Fail to read the document. Try agan...'

    return generated_text[1:len(generated_text)-1]
    
def lambda_handler(event, context):
    print(event)

    text = event['text']
    print('text: ', text)

    start = int(time.time())
    
    payload = {
        "inputs": text,
        "parameters":{
            "max_new_tokens": 512,
            "return_full_text": False,
            "do_sample": False,
            "temperature": 0.5,
            "repetition_penalty": 1.03,
            "top_p": 0.9,
            "top_k":1,
            "stop": ["<|endoftext|>", "</s>"]
        }
    }
        
    endpoint_name = os.environ.get('endpoint')

    generated_text = query_endpoint(payload, endpoint_name)

    elapsed_time = int(time.time()) - start
    print("total run time(sec): ", elapsed_time)

    return {
        'statusCode': 200,
        'msg': generated_text,
    }        
