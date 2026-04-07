#!/bin/bash

SERVICES_JS="/app/dist/services/amo-crm.service.js"

patch_container() {
    local container=$1
    echo "Patching container $container..."

    # 1. Update Lead Name
    docker exec $container sed -i "s/const leadName = \`\[WEBSITE\] \${data.source} - \${data.name}\`;/const leadName = \`\[WEBSITE\] - \${data.name}\`;/g" $SERVICES_JS

    # 2. Update Labels to Russian
    docker exec $container sed -i "s/Нова заявка з сайту:/Новая заявка с сайта:/g" $SERVICES_JS
    docker exec $container sed -i "s/Імя:/Имя:/g" $SERVICES_JS
    docker exec $container sed -i "s/Телефон: \${data.phone || 'Не вказано'}/Телефон: \${data.phone || 'Никакой информации'}/g" $SERVICES_JS
    docker exec $container sed -i "s/Повідомлення:/Сообщение:/g" $SERVICES_JS
    docker exec $container sed -i "s/Додаткова інформація:/Дополнительная информация:/g" $SERVICES_JS

    echo "Done for $container"
}

patch_container "for-you-public-api-prod"
patch_container "for-you-admin-api-prod"
