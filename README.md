# IBM Watson Speech-to-Text (STT) backup utility #

This utility connects to the targeted STT service instance and backs up all custom models deployed in the service. 

It stores the STT backup in IBM Cloud Object Storage (COS) files. The COS bucket holding the files should be different for each STT service instance to be backed up. 

The backup file structure has one file in the root folder of the COS bucket which contains a list of all models deployed in that service instance. For each deployed model in the list, there will be a subfolder named the same as the model.

Within each model backup subfolder, there will be a file named ***model-info.json*** which contains the content information for that specific model. There is also a file named ***corpora-list.json*** which contains a list of all corpora in the model. For each corpus in the corpora list there will be a separate file with the name of the corpus plus ***-corpus-content*** appended to the end of the file name. The model subfolder also contains a file named ***grammars.json*** which contains the backup of the grammars defined in the model. And there is also a file named ***words.json*** which contains a list of the custom words for the model.

The STT service instance and the COS bucket that stores the backup are identified by environment variables that are external to the source code. That way, no sensitive information is part of the utility source code and no source code change is necessary when the STT service instance is changed or the COS service is changed.

Those variables are:
- STT_NAME : The name of the STT service instance.
- STT_URL : The URL used to reach the STT service instance.
- STT_APIKEY : The API Key required to authenticate with the STT service instance.
- STT_BACKUP_BUCKET : The name of the COS bucket in which the backup files are to be stored.
- COS_ENDPOINT : The URL for the COS service instance.
- HMAC_KEY_ID : The key id part of the COS service instance credentials.
- HMAC_SECRET : The secret part of the COS service instance credentials.

When this utility is run as an IBM Code Engine Job, the environment variables are defined in Code Engine Secrets and ConfigMaps that are associated with each Job definition.
