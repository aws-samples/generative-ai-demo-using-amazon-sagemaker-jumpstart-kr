import json
import boto3
import os

connection_url = os.environ.get('connection_url')

def lambda_handler(event, context):
    print('event: ', event)

    print('connection_url: ', connection_url)
    
    return {
        'statusCode': 200,
        'info': json.dumps({
            'connection_url': connection_url
        })
    }
